from typing import Optional

from fastapi import APIRouter, HTTPException

from ..calculos import operaciones
from ..calculos.fechas import hoy_bogota
from ..core.db import conexion
from ..core.ops_ocultas import candidatas, ocultar_op
from ..schemas.ajustes import OpOculta

router = APIRouter()

OPS_FUENTES = {"deuda": "deudas", "inversion": "inversiones", "recurrente": "recurrentes"}


@router.get("/api/proximas-operaciones")
def proximas_operaciones():
    with conexion() as conn:
        hoy = hoy_bogota()
        ocultas = {r["clave"] for r in conn.execute("SELECT clave FROM ops_ocultas")}
        return operaciones.armar_proximas(candidatas(conn, hoy), ocultas, hoy)


@router.get("/api/ops-ocultas")
def listar_ops_ocultas():
    with conexion() as conn:
        items = []
        for r in conn.execute("SELECT clave, tipo, fuente_id, fecha FROM ops_ocultas ORDER BY creada_en, clave").fetchall():
            fuente = conn.execute(
                f"SELECT nombre FROM {OPS_FUENTES[r['tipo']]} WHERE id = ?", (r["fuente_id"],)
            ).fetchone()
            items.append({**dict(r), "etiqueta": fuente["nombre"] if fuente else None})
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
