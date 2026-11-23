from fastapi import APIRouter

from ..calculos import operaciones
from ..core.db import conexion
from ..core.estado import categorias, coleccion, detalle, simbolo
from ..core.sql import get_row, insert_row, update_row
from ..core.tablas import REC_COLS
from ..schemas.recurrente import RecIn
from .lecturas import register_borrado

router = APIRouter()
register_borrado(router, "rec", "recurrentes")


@router.get("/api/rec/{row_id:int}", name="get_rec")
def leer_rec(row_id: int):
    with conexion() as conn:
        rec = detalle(conn, "recurrentes", row_id)
        return {**rec, "categoria_sugerida": operaciones.categoria_sugerida(rec, categorias(conn))}


@router.post("/api/rec", name="create_rec")
def crear_rec(body: RecIn):
    with conexion() as conn:
        data = {**body.model_dump(), "activo": body.activo is not False}
        new_id = insert_row(conn, "recurrentes", REC_COLS, data)
        conn.commit()
        return get_row(conn, "recurrentes", new_id)


@router.put("/api/rec/{row_id}", name="update_rec")
def actualizar_rec(row_id: int, body: RecIn):
    with conexion() as conn:
        actual = get_row(conn, "recurrentes", row_id)
        data = body.model_dump()
        if data["activo"] is None:
            data["activo"] = actual["activo"]
        update_row(conn, "recurrentes", REC_COLS, row_id, data)
        conn.commit()
        return get_row(conn, "recurrentes", row_id)


@router.post("/api/rec/{row_id}/pausar")
def pausar_rec(row_id: int):
    with conexion() as conn:
        actual = get_row(conn, "recurrentes", row_id)
        activo = not actual["activo"]
        conn.execute("UPDATE recurrentes SET activo = ? WHERE id = ?", (int(activo), row_id))
        conn.commit()
        return {"id": row_id, "activo": activo}


@router.get("/api/rec/resumen")
def rec_resumen():
    with conexion() as conn:
        resumen = operaciones.resumen_recurrentes(coleccion(conn, "recurrentes"), simbolo(conn))
        cats = categorias(conn)
    for lista in ("ingresos", "gastos"):
        resumen[lista] = [{**r, "categoria_sugerida": operaciones.categoria_sugerida(r, cats)} for r in resumen[lista]]
    return resumen
