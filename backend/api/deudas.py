import logging

from fastapi import APIRouter

from ..calculos import operaciones
from ..calculos.fechas import hoy_bogota
from ..calculos.operaciones import asientos, frases_deuda as frases, movimientos
from ..calculos.operaciones.defaults import fecha_o_ahora
from ..core.db import conexion
from ..core.estado import coleccion, detalle, simbolo
from ..core.ops_ocultas import ocultar_op
from ..core.sql import fijar_saldo, get_row, guardar_y_leer, insert_row, insert_tx, update_row
from ..core.tablas import DEUDA_COLS
from ..schemas.deuda import AdelantoPreview, DeudaAdelanto, DeudaCrear, DeudaIn, DeudaPago
from ..schemas.previews import PagoPreview
from .lecturas import register_borrado

logger = logging.getLogger("moni")
router = APIRouter()

register_borrado(router, "deuda", "deudas")


def _guardar_y_leer_deuda(conn, deuda_id: int) -> dict:
    fila = guardar_y_leer(conn, "deudas", deuda_id)
    return {**fila, "es_tarjeta": bool(fila["es_tarjeta"])}


@router.get("/api/deuda/{deuda_id:int}", name="get_deuda")
def leer_deuda(deuda_id: int):
    with conexion() as conn:
        deuda = detalle(conn, "deudas", deuda_id, hoy_bogota())
        return {**deuda, "frases": frases.frases_deuda(deuda, simbolo(conn))}


@router.post("/api/deuda", name="create_deuda")
def crear_deuda(body: DeudaCrear):
    with conexion() as conn:
        data = operaciones.completar_deuda(operaciones.normalizar_tasa(body.model_dump()), hoy_bogota())
        crear_tx = data.pop("crear_tx")
        deuda_id = insert_row(conn, "deudas", DEUDA_COLS, data)
        if crear_tx:
            insert_tx(conn, **movimientos.tx_credito_recibido(data))
        return _guardar_y_leer_deuda(conn, deuda_id)


@router.put("/api/deuda/{deuda_id}", name="update_deuda")
def actualizar_deuda(deuda_id: int, body: DeudaIn):
    with conexion() as conn:
        data = operaciones.normalizar_tasa(body.model_dump())
        actual = get_row(conn, "deudas", deuda_id)
        ligadas = conn.execute("SELECT 1 FROM transacciones WHERE tarjeta_id = ? LIMIT 1", (deuda_id,)).fetchone()
        movimientos.validar_cambio_de_tipo(bool(actual["es_tarjeta"]), data["es_tarjeta"], ligadas is not None)
        update_row(conn, "deudas", DEUDA_COLS, deuda_id, data)
        return _guardar_y_leer_deuda(conn, deuda_id)


def _saldo_tras_adelanto(tarjeta: dict, body: DeudaAdelanto | AdelantoPreview) -> float:
    return movimientos.saldo_tras_adelanto(tarjeta["cupo"], body.nuevo_saldo, body.disponible_nuevo)


@router.post("/api/deuda/{deuda_id}/pago")
def pagar_deuda(deuda_id: int, body: DeudaPago):
    with conexion() as conn:
        deuda = get_row(conn, "deudas", deuda_id)
        pago = movimientos.aplicar_pago(
            deuda, total_pagado=body.total_pagado, nuevo_saldo=body.nuevo_saldo, intereses=body.intereses,
            avanzar_cuota=body.avanzar_cuota, fecha=fecha_o_ahora(body.fecha), descripcion=body.descripcion,
            notas=body.notas, simbolo=simbolo(conn),
        )
        conn.execute(
            "UPDATE deudas SET saldo_actual = ?, total_intereses = total_intereses + ?,"
            " proxima_cuota = COALESCE(?, proxima_cuota) WHERE id = ?",
            (pago.saldo_actual, pago.intereses, pago.proxima_cuota, deuda_id),
        )
        if body.registrar_tx:
            insert_tx(conn, **pago.tx)
        ocultar_op(conn, body.op_clave)
        return _guardar_y_leer_deuda(conn, deuda_id)


@router.post("/api/deuda/{deuda_id}/adelanto")
def pedir_adelanto(deuda_id: int, body: DeudaAdelanto):
    with conexion() as conn:
        tarjeta = get_row(conn, "deudas", deuda_id)
        nuevo_saldo = _saldo_tras_adelanto(tarjeta, body)
        movimientos.validar_adelanto(bool(tarjeta["es_tarjeta"]), tarjeta["saldo_actual"], nuevo_saldo)
        fijar_saldo(conn, deuda_id, nuevo_saldo)
        if body.registrar_tx:
            insert_tx(conn, **asientos.tx_adelanto_tarjeta(
                tarjeta["nombre"], body.monto, fecha_o_ahora(body.fecha), body.descripcion, body.notas
            ))
        deuda = _guardar_y_leer_deuda(conn, deuda_id)
        logger.info(
            "tarjeta %s: adelanto %.2f, saldo_actual %.2f -> %.2f",
            deuda_id, body.monto, tarjeta["saldo_actual"], nuevo_saldo,
        )
        return deuda


@router.post("/api/deuda/{deuda_id}/pago/preview")
def pago_preview(deuda_id: int, body: PagoPreview):
    with conexion() as conn:
        deuda = get_row(conn, "deudas", deuda_id)
        return operaciones.desglose_pago(deuda["saldo_actual"], body.total_pagado, body.nuevo_saldo)


@router.post("/api/deuda/{deuda_id}/adelanto/preview")
def adelanto_preview(deuda_id: int, body: AdelantoPreview):
    with conexion() as conn:
        deuda = get_row(conn, "deudas", deuda_id)
        nuevo_saldo = _saldo_tras_adelanto(deuda, body)
        return {
            "nuevo_saldo": nuevo_saldo,
            "comision": operaciones.comision_adelanto(deuda["saldo_actual"], body.monto, nuevo_saldo),
        }


@router.get("/api/deudas/resumen")
def deudas_resumen():
    with conexion() as conn:
        resumen = operaciones.resumen_deudas(coleccion(conn, "deudas", hoy_bogota()))
        return frases.con_frases(resumen, simbolo(conn))
