from fastapi import APIRouter

from ..calculos import operaciones
from ..core.db import conexion
from ..core.estado import coleccion
from ..core.tablas import REC_COLS
from ..schemas.recurrente import RecIn
from .crud import register_crud

router = APIRouter()

register_crud(router, "rec", "recurrentes", REC_COLS, RecIn)


@router.get("/api/rec/resumen")
def rec_resumen():
    with conexion() as conn:
        return operaciones.resumen_recurrentes(coleccion(conn, "recurrentes"))
