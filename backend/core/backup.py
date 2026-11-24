import sqlite3
from typing import Literal

from pydantic import BaseModel, ValidationError, field_validator

from ..calculos import operaciones
from ..calculos.categorias import validar_categoria, validar_simbolo
from ..calculos.errores import ErrorDeDominio
from ..calculos.fechas import ahora_bogota_iso, hoy_bogota
from ..calculos.formato import plural
from ..calculos.operaciones.proximas import parse_clave
from ..schemas.activo import ActivoIn
from ..schemas.ajustes import CategoriaIn, OpOcultaBackup
from ..schemas.deuda import DeudaIn
from ..schemas.inversion import InvIn
from ..schemas.recurrente import RecIn
from ..schemas.transaccion import TxIn
from . import estado as store
from .mensajes import mensaje_en_espanol
from .tablas import ACTIVO_COLS, DEUDA_COLS, INV_COLS, REC_COLS, TX_COLS


class AjusteBackup(BaseModel):
    clave: Literal["moneda_simbolo"]
    valor: str

    @field_validator("valor")
    @classmethod
    def _valor(cls, v: str) -> str:
        return validar_simbolo(v)


IMPORT_TABLES = [
    ("deudas", ["id"] + DEUDA_COLS + ["total_intereses"], DeudaIn, ("deuda", "deudas")),
    ("inversiones", ["id"] + INV_COLS, InvIn, ("inversión", "inversiones")),
    ("activos", ["id"] + ACTIVO_COLS, ActivoIn, ("activo", "activos")),
    ("recurrentes", ["id"] + REC_COLS, RecIn, ("recurrente", "recurrentes")),
    ("transacciones", ["id"] + TX_COLS, TxIn, ("transacción", "transacciones")),
    ("categorias", ["tipo", "nombre"], CategoriaIn, ("categoría", "categorías")),
    ("ops_ocultas", ["clave", "tipo", "fuente_id", "fecha", "creada_en"], OpOcultaBackup, ("operación oculta", "operaciones ocultas")),
]


def _normalizar_inversion(fila):
    operaciones.completar_inversion(fila, None, hoy_bogota())


def _normalizar_op_oculta(fila):
    try:
        fila["tipo"], fila["fuente_id"], fila["fecha"] = parse_clave(fila["clave"])
    except ValueError as e:
        raise ErrorDeDominio(f"Operación oculta inválida: {e}")
    fila["creada_en"] = fila["creada_en"] or ahora_bogota_iso()


NORMALIZADORES = {"inversiones": _normalizar_inversion, "ops_ocultas": _normalizar_op_oculta}


def _errores_en_espanol(error):
    return "; ".join(f"{'.'.join(map(str, e['loc']))}: {mensaje_en_espanol(e)}" for e in error.errors())


def _validar_fila(table, model, row, idx):
    if not isinstance(row, dict):
        raise ErrorDeDominio(f"Fila {table}[{idx}]: se esperaba un objeto")
    try:
        limpia = model.model_validate(row).model_dump()
    except ValidationError as e:
        raise ErrorDeDominio(f"Fila {table}[{idx}] inválida: {_errores_en_espanol(e)}")
    for extra in ("id", "total_intereses"):
        if extra in row and row[extra] is not None:
            if not isinstance(row[extra], (int, float)) or isinstance(row[extra], bool):
                raise ErrorDeDominio(f"Fila {table}[{idx}]: {extra} debe ser numérico")
            limpia[extra] = row[extra]
    if table in NORMALIZADORES:
        NORMALIZADORES[table](limpia)
    return limpia


def _validar_categorias(filas):
    vistas = {}
    for i, fila in enumerate(filas):
        try:
            fila["nombre"] = validar_categoria(fila["tipo"], fila["nombre"], vistas.setdefault(fila["tipo"], set()))
        except ErrorDeDominio as e:
            raise ErrorDeDominio(f"Fila categorias[{i}] inválida: {e}")
        vistas[fila["tipo"]].add(fila["nombre"])
    return filas


def validar_import(payload):
    validadas = {
        table: [_validar_fila(table, model, r, i) for i, r in enumerate(payload.get(table) or [])]
        for table, _cols, model, _nombres in IMPORT_TABLES
    }
    _validar_categorias(validadas["categorias"])
    validadas["ajustes"] = [
        _validar_fila("ajustes", AjusteBackup, r, i) for i, r in enumerate(payload.get("ajustes") or [])
    ]
    return validadas


def _mensaje_integridad(error):
    detalle = str(error)
    if detalle.startswith("UNIQUE"):
        return f"Import falló (¿ids duplicados? borrá los datos existentes primero): {detalle}"
    return f"Import falló: fila inválida ({detalle})"


def _texto_importado(counts):
    partes = [plural(counts[table], *nombres) for table, _c, _m, nombres in IMPORT_TABLES]
    return "Importado: " + ", ".join(partes)


def insertar_import(conn, validadas):
    counts = {}
    try:
        for table, cols, _model, _nombres in IMPORT_TABLES:
            col_list = ", ".join(cols)
            placeholders = ", ".join("?" * len(cols))
            for row in validadas[table]:
                conn.execute(
                    f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})",
                    [row.get(c) for c in cols],
                )
            counts[table] = len(validadas[table])
        for ajuste in validadas["ajustes"]:
            store.guardar_moneda_simbolo(conn, ajuste["valor"])
        counts["ajustes"] = len(validadas["ajustes"])
        conn.commit()
    except sqlite3.IntegrityError as e:
        conn.rollback()
        raise ErrorDeDominio(_mensaje_integridad(e))
    return {"counts": counts, "texto": _texto_importado(counts)}
