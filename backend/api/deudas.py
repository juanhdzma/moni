import datetime
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException

from ..calculos import operaciones
from ..calculos.fechas import sumar_meses
from ..core.db import conexion
from ..core.estado import coleccion
from ..core.montos import pesos
from ..core.ops_ocultas import ocultar_op
from ..core.sql import get_row, insert_tx
from ..core.tablas import CAT_INGRESO, CAT_TRANSFER, DEUDA_COLS
from ..schemas.deuda import DeudaAdelanto, DeudaIn, DeudaPago
from ..schemas.previews import AdelantoPreview, PagoPreview
from .crud import register_crud

logger = logging.getLogger("moni")
router = APIRouter()

register_crud(router, "deuda", "deudas", DEUDA_COLS, DeudaIn, linked_tx={
    "tipo": "ingreso", "categoria": CAT_INGRESO["credito_recibido"], "fecha_field": "fecha_inicio",
    "desc_fn": lambda d: f"Crédito · {d['nombre']}",
    "monto_fn": lambda d: d.get("monto_inicial") or d["saldo_actual"],
})


def _sumar_un_mes(fecha: str) -> str:
    d = datetime.date.fromisoformat(fecha[:10])
    return sumar_meses(d, 1, d.day).isoformat()


def _proxima_cuota_despues_del_pago(deuda: dict, body: DeudaPago) -> Optional[str]:
    if deuda["es_tarjeta"] or not deuda["proxima_cuota"]:
        return None
    if body.nuevo_saldo <= 0:
        return ""
    return _sumar_un_mes(deuda["proxima_cuota"]) if body.avanzar_cuota else None


@router.post("/api/deuda/{deuda_id}/pago")
def pagar_deuda(deuda_id: int, body: DeudaPago):
    with conexion() as conn:
        deuda = get_row(conn, "deudas", deuda_id)
        if body.nuevo_saldo > deuda["saldo_actual"]:
            raise HTTPException(400, "El saldo después del pago no puede superar el saldo actual")
        conn.execute(
            "UPDATE deudas SET saldo_actual = ?, total_intereses = total_intereses + ? WHERE id = ?",
            (pesos(body.nuevo_saldo), pesos(body.intereses), deuda_id),
        )
        proxima = _proxima_cuota_despues_del_pago(deuda, body)
        if proxima is not None:
            conn.execute("UPDATE deudas SET proxima_cuota = ? WHERE id = ?", (proxima, deuda_id))
        if body.registrar_tx:
            insert_tx(
                conn, fecha=body.fecha, tipo="transfer", categoria=CAT_TRANSFER["pago_deuda"],
                descripcion=body.descripcion, monto=body.total_pagado, notas=body.notas,
            )
        if body.op_clave:
            ocultar_op(conn, body.op_clave)
        conn.commit()
        return get_row(conn, "deudas", deuda_id)


@router.post("/api/deuda/{deuda_id}/adelanto")
def pedir_adelanto(deuda_id: int, body: DeudaAdelanto):
    with conexion() as conn:
        tarjeta = get_row(conn, "deudas", deuda_id)
        if not tarjeta["es_tarjeta"]:
            raise HTTPException(400, "Solo las tarjetas admiten adelantos")
        if body.nuevo_saldo < tarjeta["saldo_actual"]:
            raise HTTPException(400, "El saldo después del adelanto no puede ser menor al saldo actual")
        conn.execute("UPDATE deudas SET saldo_actual = ? WHERE id = ?", (pesos(body.nuevo_saldo), deuda_id))
        if body.registrar_tx:
            insert_tx(
                conn, fecha=body.fecha, tipo="ingreso", categoria=CAT_INGRESO["avance_tarjeta"],
                descripcion=body.descripcion, monto=body.monto, notas=body.notas,
            )
        conn.commit()
        logger.info(
            "tarjeta %s: adelanto %.2f, saldo_actual %.2f -> %.2f",
            deuda_id, body.monto, tarjeta["saldo_actual"], body.nuevo_saldo,
        )
        return get_row(conn, "deudas", deuda_id)


@router.post("/api/deuda/{deuda_id}/pago/preview")
def pago_preview(deuda_id: int, body: PagoPreview):
    with conexion() as conn:
        deuda = get_row(conn, "deudas", deuda_id)
        return operaciones.desglose_pago(deuda["saldo_actual"], body.total_pagado, body.nuevo_saldo)


@router.post("/api/deuda/{deuda_id}/adelanto/preview")
def adelanto_preview(deuda_id: int, body: AdelantoPreview):
    with conexion() as conn:
        deuda = get_row(conn, "deudas", deuda_id)
        return {"comision": operaciones.comision_adelanto(deuda["saldo_actual"], body.monto, body.nuevo_saldo)}


@router.get("/api/deudas/resumen")
def deudas_resumen():
    with conexion() as conn:
        return operaciones.resumen_deudas(coleccion(conn, "deudas"))
