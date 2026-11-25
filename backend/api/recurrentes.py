from fastapi import APIRouter, Response

from ..calculos import operaciones
from ..calculos.operaciones import movimientos
from ..calculos.fechas import hoy_bogota
from ..core.afectadas import RECURRENTES, afectar
from ..core.db import conexion
from ..core.estado import categorias, coleccion, detalle, simbolo
from ..core.sql import actualizar_columnas, get_row, guardar_y_leer, insert_row, update_row
from ..core.tablas import REC_COLS
from ..schemas.recurrente import RecIn
from .lecturas import register_borrado

router = APIRouter()
register_borrado(router, "rec", "recurrentes", (RECURRENTES,))


@router.get("/api/rec/{row_id:int}", name="get_rec")
def leer_rec(row_id: int):
    with conexion() as conn:
        rec = detalle(conn, "recurrentes", row_id, hoy_bogota())
        return operaciones.con_categoria_sugerida(rec, categorias(conn))


@router.post("/api/rec", name="create_rec")
def crear_rec(body: RecIn, response: Response):
    with conexion() as conn:
        new_id = insert_row(conn, "recurrentes", REC_COLS, body.model_dump())
        afectar(response, RECURRENTES)
        return guardar_y_leer(conn, "recurrentes", new_id)


@router.put("/api/rec/{row_id}", name="update_rec")
def actualizar_rec(row_id: int, body: RecIn, response: Response):
    with conexion() as conn:
        actual = get_row(conn, "recurrentes", row_id)
        data = operaciones.completar_recurrente(body.model_dump(), actual, "activo" in body.model_fields_set)
        update_row(conn, "recurrentes", REC_COLS, row_id, data)
        afectar(response, RECURRENTES)
        return guardar_y_leer(conn, "recurrentes", row_id)


@router.post("/api/rec/{row_id}/pausar")
def pausar_rec(row_id: int, response: Response):
    with conexion() as conn:
        actual = get_row(conn, "recurrentes", row_id)
        activo = movimientos.alternar_activo(actual)
        actualizar_columnas(conn, "recurrentes", row_id, {"activo": int(activo)})
        conn.commit()
        afectar(response, RECURRENTES)
        return {"id": row_id, "activo": activo}


@router.get("/api/rec/resumen")
def rec_resumen():
    with conexion() as conn:
        return operaciones.resumen_recurrentes(coleccion(conn, "recurrentes", hoy_bogota()), categorias(conn), simbolo(conn))
