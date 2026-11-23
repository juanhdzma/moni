import sqlite3

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from ..calculos import operaciones
from ..calculos.formato import plural
from ..calculos.fechas import ahora_bogota_iso, hoy_bogota
from ..core.db import conexion
from ..core.ops_ocultas import parse_clave
from ..core.tablas import ACTIVO_COLS, DEUDA_COLS, INV_COLS, REC_COLS, TX_COLS
from ..schemas.activo import ActivoIn
from ..schemas.ajustes import CategoriaIn, OpOcultaBackup
from ..schemas.backup import ImportPayload
from ..schemas.deuda import DeudaIn
from ..schemas.inversion import InvIn
from ..schemas.recurrente import RecIn
from ..schemas.transaccion import TxIn
from .errores import mensaje_en_espanol

router = APIRouter()

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
        raise HTTPException(400, f"ops_ocultas inválida: {e}")
    fila["creada_en"] = fila["creada_en"] or ahora_bogota_iso()


NORMALIZADORES = {"inversiones": _normalizar_inversion, "ops_ocultas": _normalizar_op_oculta}


def _errores_en_espanol(error):
    return "; ".join(f"{'.'.join(map(str, e['loc']))}: {mensaje_en_espanol(e)}" for e in error.errors())


def _validar_fila_import(table, model, row, idx):
    if not isinstance(row, dict):
        raise HTTPException(400, f"{table}[{idx}]: se esperaba un objeto")
    try:
        limpia = model.model_validate(row).model_dump()
    except ValidationError as e:
        raise HTTPException(400, f"{table}[{idx}] inválido: {_errores_en_espanol(e)}")
    for extra in ("id", "total_intereses"):
        if extra in row and row[extra] is not None:
            if not isinstance(row[extra], (int, float)) or isinstance(row[extra], bool):
                raise HTTPException(400, f"{table}[{idx}].{extra} debe ser numérico")
            limpia[extra] = row[extra]
    if table in NORMALIZADORES:
        NORMALIZADORES[table](limpia)
    return limpia


def _mensaje_integridad(error):
    detalle = str(error)
    if detalle.startswith("UNIQUE"):
        return f"Import falló (¿ids duplicados? borrá los datos existentes primero): {detalle}"
    return f"Import falló: fila inválida ({detalle})"


def _texto_importado(counts):
    partes = [plural(counts[table], *nombres) for table, _c, _m, nombres in IMPORT_TABLES]
    return "Importado: " + ", ".join(partes)


@router.get("/api/backup")
def exportar():
    with conexion() as conn:
        return {
            table: [dict(r) for r in conn.execute(f"SELECT * FROM {table} ORDER BY rowid")]
            for table, *_ in IMPORT_TABLES
        }


@router.post("/api/import")
def import_data(body: ImportPayload):
    payload = body.model_dump()
    validadas = {
        table: [_validar_fila_import(table, model, r, i) for i, r in enumerate(payload.get(table) or [])]
        for table, _cols, model, _nombres in IMPORT_TABLES
    }
    with conexion() as conn:
        counts = {}
        try:
            for table, cols, _model, _nombres in IMPORT_TABLES:
                rows = validadas[table]
                col_list = ", ".join(cols)
                placeholders = ", ".join("?" * len(cols))
                for row in rows:
                    conn.execute(
                        f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})",
                        [row.get(c) for c in cols],
                    )
                counts[table] = len(rows)
            conn.commit()
            return {"counts": counts, "texto": _texto_importado(counts)}
        except sqlite3.IntegrityError as e:
            conn.rollback()
            raise HTTPException(400, _mensaje_integridad(e))


@router.post("/api/truncate")
def truncate_all():
    with conexion() as conn:
        for table, *_ in IMPORT_TABLES:
            conn.execute(f"DELETE FROM {table}")
            conn.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
        conn.commit()
        return {"ok": True}
