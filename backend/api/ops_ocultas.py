from typing import Optional

from fastapi import APIRouter, Response

from ..calculos import operaciones
from ..calculos.errores import ErrorDeDominio
from ..calculos.fechas import hoy_bogota
from ..core.afectadas import OPS_OCULTAS, afectar
from ..core.db import conexion
from ..core.estado import simbolo
from ..core.ops_ocultas import candidatas_visibles, ocultar_op, ocultas_con_etiqueta
from ..schemas.ajustes import OpOculta

router = APIRouter()


@router.get("/api/proximas-operaciones")
def proximas_operaciones():
    with conexion() as conn:
        hoy = hoy_bogota()
        return operaciones.armar_proximas(candidatas_visibles(conn, hoy), set(), hoy, simbolo(conn))


@router.get("/api/ops-ocultas")
def listar_ops_ocultas():
    with conexion() as conn:
        return {"items": ocultas_con_etiqueta(conn)}


@router.post("/api/ops-ocultas", status_code=201)
def crear_op_oculta(body: OpOculta, response: Response):
    with conexion() as conn:
        ocultar_op(conn, body.clave)
        conn.commit()
        afectar(response, OPS_OCULTAS)
        return {"clave": body.clave}


@router.delete("/api/ops-ocultas", status_code=204)
def borrar_ops_ocultas(response: Response, clave: Optional[str] = None):
    with conexion() as conn:
        if clave is None:
            conn.execute("DELETE FROM ops_ocultas")
        elif conn.execute("DELETE FROM ops_ocultas WHERE clave = ?", (clave,)).rowcount == 0:
            raise ErrorDeDominio("Operación oculta no encontrada", 404)
        conn.commit()
        afectar(response, OPS_OCULTAS)
