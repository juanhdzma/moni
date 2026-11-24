from fastapi import APIRouter

from ..calculos.categorias import es_categoria_sistema, validar_categoria
from ..calculos.errores import ErrorDeDominio
from ..core import estado as store
from ..core.db import conexion
from ..schemas.ajustes import AjustesIn, CategoriaIn
from ..schemas.validadores import TipoTx

router = APIRouter()


@router.post("/api/categorias", status_code=201)
def crear_categoria(body: CategoriaIn):
    with conexion() as conn:
        nombre = validar_categoria(body.tipo, body.nombre, store.nombres_categorias(conn, body.tipo))
        store.agregar_categoria(conn, body.tipo, nombre)
        conn.commit()
        return store.categorias(conn)


@router.delete("/api/categorias")
def borrar_categoria(tipo: TipoTx, nombre: str):
    with conexion() as conn:
        if es_categoria_sistema(tipo, nombre):
            raise ErrorDeDominio("Las categorías de sistema no se pueden borrar", 409)
        if store.borrar_categoria(conn, tipo, nombre) == 0:
            raise ErrorDeDominio("Categoría no encontrada", 404)
        conn.commit()
        return store.categorias(conn)


@router.put("/api/ajustes")
def put_ajustes(body: AjustesIn):
    with conexion() as conn:
        store.guardar_moneda_simbolo(conn, body.moneda_simbolo)
        conn.commit()
        return store.ajustes(conn)
