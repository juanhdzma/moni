from fastapi import APIRouter, HTTPException

from ..calculos import listados
from ..core import estado as store
from ..core.db import conexion
from ..core.ops_ocultas import ocultar_op
from ..schemas.ajustes import AjustesIn, CategoriaIn, MigracionLocal
from ..schemas.validadores import TipoTx

router = APIRouter()


@router.get("/api/categorias")
def get_categorias():
    with conexion() as conn:
        return store.categorias(conn)


@router.post("/api/categorias", status_code=201)
def crear_categoria(body: CategoriaIn):
    with conexion() as conn:
        existentes = {r["nombre"] for r in conn.execute("SELECT nombre FROM categorias WHERE tipo = ?", (body.tipo,))}
        try:
            nombre = listados.validar_categoria(body.tipo, body.nombre, existentes)
        except listados.CategoriaDuplicada as e:
            raise HTTPException(409, str(e))
        except ValueError as e:
            raise HTTPException(422, str(e))
        conn.execute("INSERT INTO categorias (tipo, nombre) VALUES (?, ?)", (body.tipo, nombre))
        conn.commit()
        return store.categorias(conn)


@router.delete("/api/categorias")
def borrar_categoria(tipo: TipoTx, nombre: str):
    with conexion() as conn:
        if listados.es_categoria_sistema(tipo, nombre):
            raise HTTPException(409, "las categorías de sistema no se pueden borrar")
        if conn.execute("DELETE FROM categorias WHERE tipo = ? AND nombre = ?", (tipo, nombre)).rowcount == 0:
            raise HTTPException(404, "categoría no encontrada")
        conn.commit()
        return store.categorias(conn)


@router.get("/api/ajustes")
def get_ajustes():
    with conexion() as conn:
        return store.ajustes(conn)


@router.put("/api/ajustes")
def put_ajustes(body: AjustesIn):
    with conexion() as conn:
        conn.execute(
            "INSERT INTO ajustes (clave, valor) VALUES ('moneda_simbolo', ?) "
            "ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
            (body.moneda_simbolo,),
        )
        conn.commit()
        return store.ajustes(conn)


def _migrar_categorias(conn, categorias):
    migradas = 0
    for tipo, nombres in categorias.items():
        if tipo not in listados.TIPOS:
            continue
        for nombre in nombres[:200]:
            limpio = nombre.strip()
            if limpio and not listados.es_categoria_sistema(tipo, limpio):
                migradas += conn.execute(
                    "INSERT OR IGNORE INTO categorias (tipo, nombre) VALUES (?, ?)", (tipo, limpio)
                ).rowcount
    return migradas


def _migrar_ops_ocultas(conn, claves):
    migradas = 0
    for clave in claves:
        try:
            migradas += ocultar_op(conn, clave)
        except ValueError:
            continue
    return migradas


def _migrar_simbolo(conn, simbolo):
    if simbolo is None:
        return False
    try:
        limpio = listados.validar_simbolo(simbolo)
    except ValueError:
        return False
    return conn.execute(
        "INSERT OR IGNORE INTO ajustes (clave, valor) VALUES ('moneda_simbolo', ?)", (limpio,)
    ).rowcount > 0


@router.post("/api/migrar-local")
def migrar_local(body: MigracionLocal):
    with conexion() as conn:
        resultado = {
            "categorias": _migrar_categorias(conn, body.categorias),
            "ops_ocultas": _migrar_ops_ocultas(conn, body.ops_ocultas),
            "moneda_simbolo": _migrar_simbolo(conn, body.moneda_simbolo),
        }
        conn.commit()
        return resultado
