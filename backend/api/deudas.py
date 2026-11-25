import logging

from fastapi import APIRouter, Response

from ..calculos import operaciones
from ..calculos.constantes import clase_deuda_de
from ..calculos.fechas import fecha_o_ahora, hoy_bogota
from ..calculos.operaciones import asientos, frases_deuda as frases, movimientos
from ..core.afectadas import DEUDAS, TRANSACCIONES, afectar, con_movimiento, con_op_oculta
from ..core.db import conexion
from ..core.estado import coleccion, detalle, simbolo
from ..core.ops_ocultas import ocultar_op
from ..core.sql import (
    iniciar_escritura,
    aplicar_pago_deuda, desligar_tx, fijar_saldo, get_row, guardar_y_leer, insert_row, insert_tx, tiene_tx_ligadas, update_row,
)
from ..core.tablas import DEUDA_COLS
from ..schemas.deuda import AdelantoPreview, DeudaAdelanto, DeudaCrear, DeudaIn, DeudaPago
from ..schemas.previews import PagoPreview
from ..schemas.respuestas.deudas import Deuda, DeudaCruda, PreviewAdelanto, PreviewPago, ResumenDeudas
from .lecturas import register_borrado

logger = logging.getLogger("moni")
router = APIRouter()

register_borrado(router, "deuda", "deudas", (DEUDAS, TRANSACCIONES), desligar_tx)


def _guardar_y_leer_deuda(conn, deuda_id: int) -> dict:
    fila = guardar_y_leer(conn, "deudas", deuda_id)
    return {**fila, "es_tarjeta": bool(fila["es_tarjeta"]), "clase_deuda": clase_deuda_de(fila["es_tarjeta"])}


@router.get("/api/deuda/{deuda_id:int}", name="get_deuda", response_model=Deuda)
def leer_deuda(deuda_id: int):
    with conexion() as conn:
        deuda = detalle(conn, "deudas", deuda_id, hoy_bogota())
        return {**deuda, "frases": frases.frases_deuda(deuda, simbolo(conn))}


@router.post("/api/deuda", name="create_deuda", response_model=DeudaCruda)
def crear_deuda(body: DeudaCrear, response: Response):
    with conexion() as conn:
        data = operaciones.completar_deuda(operaciones.normalizar_tasa(body.model_dump(exclude={"crear_tx"})), hoy_bogota())
        deuda_id = insert_row(conn, "deudas", DEUDA_COLS, data)
        if body.crear_tx:
            insert_tx(conn, **movimientos.tx_credito_recibido(data))
        afectar(response, *con_movimiento(DEUDAS, body.crear_tx))
        return _guardar_y_leer_deuda(conn, deuda_id)


@router.put("/api/deuda/{deuda_id:int}", name="update_deuda", response_model=DeudaCruda)
def actualizar_deuda(deuda_id: int, body: DeudaIn, response: Response):
    with conexion() as conn:
        data = operaciones.normalizar_tasa(body.model_dump())
        actual = get_row(conn, "deudas", deuda_id)
        movimientos.validar_cambio_de_tipo(bool(actual["es_tarjeta"]), data["es_tarjeta"], tiene_tx_ligadas(conn, deuda_id))
        update_row(conn, "deudas", DEUDA_COLS, deuda_id, data)
        afectar(response, DEUDAS)
        return _guardar_y_leer_deuda(conn, deuda_id)


def _saldo_tras_adelanto(tarjeta: dict, body: DeudaAdelanto | AdelantoPreview) -> float:
    return movimientos.saldo_tras_adelanto(tarjeta["cupo"], body.nuevo_saldo, body.disponible_nuevo)


@router.post("/api/deuda/{deuda_id:int}/pago", response_model=DeudaCruda)
def pagar_deuda(deuda_id: int, body: DeudaPago, response: Response):
    with conexion() as conn:
        iniciar_escritura(conn)
        deuda = get_row(conn, "deudas", deuda_id)
        pago = movimientos.aplicar_pago(
            deuda, total_pagado=body.total_pagado, nuevo_saldo=body.nuevo_saldo, intereses=body.intereses,
            avanzar_cuota=body.modo == "cuota", liquidar=body.modo == "liquidar", fecha=fecha_o_ahora(body.fecha), descripcion=body.descripcion,
            notas=body.notas, simbolo=simbolo(conn),
        )
        aplicar_pago_deuda(conn, deuda_id, pago.saldo_actual, pago.intereses, pago.proxima_cuota)
        if body.registrar_tx:
            insert_tx(conn, **pago.tx)
        ocultar_op(conn, body.op_clave)
        afectar(response, *con_op_oculta(con_movimiento(DEUDAS, body.registrar_tx), body.op_clave))
        return _guardar_y_leer_deuda(conn, deuda_id)


@router.post("/api/deuda/{deuda_id:int}/adelanto", response_model=DeudaCruda)
def pedir_adelanto(deuda_id: int, body: DeudaAdelanto, response: Response):
    with conexion() as conn:
        iniciar_escritura(conn)
        tarjeta = get_row(conn, "deudas", deuda_id)
        nuevo_saldo = _saldo_tras_adelanto(tarjeta, body)
        movimientos.validar_adelanto(bool(tarjeta["es_tarjeta"]), tarjeta["saldo_actual"], nuevo_saldo)
        fijar_saldo(conn, deuda_id, nuevo_saldo)
        if body.registrar_tx:
            insert_tx(conn, **asientos.tx_adelanto_tarjeta(
                tarjeta["nombre"], body.monto, fecha_o_ahora(body.fecha), body.descripcion, body.notas
            ))
        deuda = _guardar_y_leer_deuda(conn, deuda_id)
        afectar(response, *con_movimiento(DEUDAS, body.registrar_tx))
        logger.info(
            "tarjeta %s: adelanto %.2f, saldo_actual %.2f -> %.2f",
            deuda_id, body.monto, tarjeta["saldo_actual"], nuevo_saldo,
        )
        return deuda


@router.post("/api/deuda/{deuda_id:int}/pago/preview", response_model=PreviewPago | None)
def pago_preview(deuda_id: int, body: PagoPreview):
    with conexion() as conn:
        deuda = get_row(conn, "deudas", deuda_id)
        if not body.total_pagado or body.nuevo_saldo is None:
            return None
        return operaciones.desglose_pago(deuda["saldo_actual"], body.total_pagado, body.nuevo_saldo)


@router.post("/api/deuda/{deuda_id:int}/adelanto/preview", response_model=PreviewAdelanto)
def adelanto_preview(deuda_id: int, body: AdelantoPreview):
    with conexion() as conn:
        deuda = get_row(conn, "deudas", deuda_id)
        nuevo_saldo = _saldo_tras_adelanto(deuda, body)
        return {
            "nuevo_saldo": nuevo_saldo,
            "comision": operaciones.comision_adelanto(deuda["saldo_actual"], body.monto, nuevo_saldo),
        }


@router.get("/api/deudas/resumen", response_model=ResumenDeudas)
def deudas_resumen():
    with conexion() as conn:
        resumen = operaciones.resumen_deudas(coleccion(conn, "deudas", hoy_bogota()))
        return frases.con_frases(resumen, simbolo(conn))
