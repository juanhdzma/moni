from typing import Optional

from fastapi import APIRouter, HTTPException

from ..calculos import operaciones
from ..calculos.fechas import hoy_bogota
from ..core.db import conexion
from ..core.estado import ajustes
from ..core.ops_ocultas import FUENTES_OPS, candidatas, ocultar_op
from ..schemas.ajustes import OpOculta

router = APIRouter()


@router.get("/api/proximas-operaciones")
def proximas_operaciones():
    with conexion() as conn:
        hoy = hoy_bogota()
        ocultas = {r["clave"] for r in conn.execute("SELECT clave FROM ops_ocultas")}
        return operaciones.armar_proximas(candidatas(conn, hoy), ocultas, hoy, ajustes(conn)["moneda_simbolo"])


@router.get("/api/ops-ocultas")
def listar_ops_ocultas():
    with conexion() as conn:
        nombres = {
            tipo: {r["id"]: r["nombre"] for r in conn.execute(f"SELECT id, nombre FROM {tabla}")}
            for tipo, tabla in FUENTES_OPS.items()
        }
        filas = conn.execute("SELECT clave, tipo, fuente_id, fecha FROM ops_ocultas ORDER BY creada_en, clave")
        items = [{**dict(r), "etiqueta": nombres[r["tipo"]].get(r["fuente_id"])} for r in filas]
        return {"items": items}


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
