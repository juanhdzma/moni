from typing import Optional

from fastapi import APIRouter, HTTPException

from ..calculos import operaciones
from ..calculos.fechas import hoy_bogota
from ..core.db import conexion
from ..core.estado import simbolo
from ..core.ops_ocultas import candidatas, claves_ocultas, ocultar_op, ocultas_con_etiqueta
from ..schemas.ajustes import OpOculta

router = APIRouter()


@router.get("/api/proximas-operaciones")
def proximas_operaciones():
    with conexion() as conn:
        hoy = hoy_bogota()
        return operaciones.armar_proximas(candidatas(conn, hoy), claves_ocultas(conn), hoy, simbolo(conn))


@router.get("/api/ops-ocultas")
def listar_ops_ocultas():
    with conexion() as conn:
        return {"items": ocultas_con_etiqueta(conn)}


@router.post("/api/ops-ocultas", status_code=201)
def crear_op_oculta(body: OpOculta):
    with conexion() as conn:
        ocultar_op(conn, body.clave)
        conn.commit()
        return {"clave": body.clave}


@router.delete("/api/ops-ocultas", status_code=204)
def borrar_ops_ocultas(clave: Optional[str] = None):
    with conexion() as conn:
        if clave is None:
            conn.execute("DELETE FROM ops_ocultas")
        elif conn.execute("DELETE FROM ops_ocultas WHERE clave = ?", (clave,)).rowcount == 0:
            raise HTTPException(404, "operación oculta no encontrada")
        conn.commit()
