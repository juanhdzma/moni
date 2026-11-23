from fastapi import APIRouter

from ..calculos import listados
from ..calculos.operaciones.movimientos import ErrorDeDominio
from ..core import estado as store
from ..core.db import conexion
from ..schemas.ajustes import AjustesIn, CategoriaIn
from ..schemas.validadores import TipoTx

router = APIRouter()


@router.post("/api/categorias", status_code=201)
def crear_categoria(body: CategoriaIn):
    with conexion() as conn:
        existentes = {r["nombre"] for r in conn.execute("SELECT nombre FROM categorias WHERE tipo = ?", (body.tipo,))}
        nombre = listados.validar_categoria(body.tipo, body.nombre, existentes)
        conn.execute("INSERT INTO categorias (tipo, nombre) VALUES (?, ?)", (body.tipo, nombre))
        conn.commit()
        return store.categorias(conn)


@router.delete("/api/categorias")
def borrar_categoria(tipo: TipoTx, nombre: str):
    with conexion() as conn:
        if listados.es_categoria_sistema(tipo, nombre):
            raise ErrorDeDominio("Las categorías de sistema no se pueden borrar", 409)
        if conn.execute("DELETE FROM categorias WHERE tipo = ? AND nombre = ?", (tipo, nombre)).rowcount == 0:
            raise ErrorDeDominio("Categoría no encontrada", 404)
        conn.commit()
        return store.categorias(conn)


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
