from fastapi import APIRouter, Response

from ..calculos.fechas import hoy_bogota
from ..core.afectadas import ACTIVOS, DEUDAS, INVERSIONES, RECURRENTES, TRANSACCIONES, afectar
from ..core.db import conexion
from ..core.estado import detalle
from ..core.sql import delete_row


def register_lectura(router: APIRouter, path, table):
    @router.get(f"/api/{path}/{{row_id:int}}", name=f"get_{path}")
    def leer(row_id: int):
        with conexion() as conn:
            return detalle(conn, table, row_id, hoy_bogota())


AFECTADAS_AL_BORRAR = {
    "deudas": (DEUDAS, TRANSACCIONES),
    "inversiones": (INVERSIONES,),
    "activos": (ACTIVOS,),
    "recurrentes": (RECURRENTES,),
}


def register_borrado(router: APIRouter, path, table):
    @router.delete(f"/api/{path}/{{row_id}}", status_code=204, name=f"delete_{path}")
    def borrar(row_id: int, response: Response):
        with conexion() as conn:
            delete_row(conn, table, row_id)
            if table == "deudas":
                conn.execute("UPDATE transacciones SET tarjeta_id = NULL WHERE tarjeta_id = ?", (row_id,))
            conn.commit()
        afectar(response, *AFECTADAS_AL_BORRAR[table])
