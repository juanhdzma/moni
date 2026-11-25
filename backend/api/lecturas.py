from fastapi import APIRouter, Response

from ..calculos.base.fechas import hoy_bogota
from ..core.afectadas import afectar
from ..core.db import conexion
from ..core.estado import detalle
from ..core.sql import delete_row


def register_lectura(router: APIRouter, path, table, modelo):
    @router.get(f"/api/{path}/{{row_id:int}}", name=f"get_{path}", response_model=modelo)
    def leer(row_id: int):
        with conexion() as conn:
            return detalle(conn, table, row_id, hoy_bogota())


def register_borrado(router: APIRouter, path, table, afectadas, al_borrar=None):
    @router.delete(f"/api/{path}/{{row_id:int}}", status_code=204, name=f"delete_{path}")
    def borrar(row_id: int, response: Response):
        with conexion() as conn:
            delete_row(conn, table, row_id)
            if al_borrar:
                al_borrar(conn, row_id)
            conn.commit()
        afectar(response, *afectadas)
