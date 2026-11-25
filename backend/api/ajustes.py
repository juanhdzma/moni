from fastapi import APIRouter, Response

from ..calculos.categorias import es_categoria_sistema, validar_categoria
from ..calculos.errores import ErrorDeDominio
from ..core import estado as store
from ..core.afectadas import AJUSTES, CATEGORIAS, afectar
from ..core.db import conexion
from ..schemas.ajustes import AjustesIn, CategoriaIn
from ..schemas.respuestas.comun import Categorias
from ..schemas.respuestas.sistema import Ajustes
from ..schemas.validadores import TipoTx

router = APIRouter()


@router.post("/api/categorias", status_code=201, response_model=Categorias)
def crear_categoria(body: CategoriaIn, response: Response):
    with conexion() as conn:
        nombre = validar_categoria(body.tipo, body.nombre, store.nombres_categorias(conn, body.tipo))
        store.agregar_categoria(conn, body.tipo, nombre)
        conn.commit()
        afectar(response, CATEGORIAS)
        return store.categorias(conn)


@router.delete("/api/categorias", response_model=Categorias)
def borrar_categoria(tipo: TipoTx, nombre: str, response: Response):
    with conexion() as conn:
        if es_categoria_sistema(tipo, nombre):
            raise ErrorDeDominio("Las categorías de sistema no se pueden borrar", 409)
        if store.borrar_categoria(conn, tipo, nombre) == 0:
            raise ErrorDeDominio("Categoría no encontrada", 404)
        conn.commit()
        afectar(response, CATEGORIAS)
        return store.categorias(conn)


@router.put("/api/ajustes", response_model=Ajustes)
def put_ajustes(body: AjustesIn, response: Response):
    with conexion() as conn:
        store.guardar_moneda_simbolo(conn, body.moneda_simbolo)
        conn.commit()
        afectar(response, AJUSTES)
        return store.ajustes(conn)
