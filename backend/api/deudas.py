import logging

from fastapi import APIRouter, HTTPException

from ..calculos import operaciones
from ..calculos.fechas import ahora_bogota
from ..calculos.operaciones import frases_deuda as frases, movimientos
from ..core.db import conexion
from ..core.estado import coleccion, detalle, simbolo
from ..core.montos import pesos
from ..core.ops_ocultas import ocultar_op
from ..core.sql import get_row, insert_row, insert_tx, update_row
from ..core.tablas import CAT_INGRESO, CAT_TRANSFER, DEUDA_COLS
from ..schemas.deuda import AdelantoPreview, DeudaAdelanto, DeudaCrear, DeudaIn, DeudaPago
from ..schemas.previews import PagoPreview
from .lecturas import register_borrado

logger = logging.getLogger("moni")
router = APIRouter()

register_borrado(router, "deuda", "deudas")


def _fila_deuda(conn, deuda_id: int) -> dict:
    fila = get_row(conn, "deudas", deuda_id)
    return {**fila, "es_tarjeta": bool(fila["es_tarjeta"])}


@router.get("/api/deuda/{deuda_id:int}", name="get_deuda")
def leer_deuda(deuda_id: int):
    with conexion() as conn:
        deuda = detalle(conn, "deudas", deuda_id)
        return {**deuda, "frases": frases.frases_deuda(deuda, simbolo(conn))}


@router.post("/api/deuda", name="create_deuda")
def crear_deuda(body: DeudaCrear):
    with conexion() as conn:
        data = operaciones.normalizar_tasa(body.model_dump())
        crear_tx = data.pop("crear_tx")
        deuda_id = insert_row(conn, "deudas", DEUDA_COLS, data)
        if crear_tx:
            insert_tx(
                conn, fecha=data["fecha_inicio"], tipo="ingreso", categoria=CAT_INGRESO["credito_recibido"],
                descripcion=f"Crédito · {data['nombre']}", monto=data["monto_inicial"] or data["saldo_actual"],
                notas="",
            )
        conn.commit()
        return _fila_deuda(conn, deuda_id)


@router.put("/api/deuda/{deuda_id}", name="update_deuda")
def actualizar_deuda(deuda_id: int, body: DeudaIn):
    with conexion() as conn:
        data = operaciones.normalizar_tasa(body.model_dump())
        update_row(conn, "deudas", DEUDA_COLS, deuda_id, data)
        conn.commit()
        return _fila_deuda(conn, deuda_id)


def _saldo_tras_adelanto(tarjeta: dict, body: DeudaAdelanto | AdelantoPreview) -> float:
    if body.nuevo_saldo is not None:
        return body.nuevo_saldo
    if not tarjeta["cupo"]:
        raise HTTPException(400, "La tarjeta no tiene cupo definido")
    return frases.saldo_tras_adelanto(tarjeta["cupo"], body.disponible_nuevo)


@router.post("/api/deuda/{deuda_id}/pago")
def pagar_deuda(deuda_id: int, body: DeudaPago):
    with conexion() as conn:
        deuda = get_row(conn, "deudas", deuda_id)
        movimientos.validar_pago(deuda["saldo_actual"], body.nuevo_saldo)
        desglose = operaciones.desglose_pago(deuda["saldo_actual"], body.total_pagado, body.nuevo_saldo)
        intereses = desglose["intereses"] if body.intereses is None else body.intereses
        proxima = movimientos.proxima_cuota_tras_pago(
            bool(deuda["es_tarjeta"]), deuda["proxima_cuota"], body.nuevo_saldo, body.avanzar_cuota
        )
        conn.execute(
            "UPDATE deudas SET saldo_actual = ?, total_intereses = total_intereses + ?,"
            " proxima_cuota = COALESCE(?, proxima_cuota) WHERE id = ?",
            (pesos(body.nuevo_saldo), pesos(intereses), proxima, deuda_id),
        )
        if body.registrar_tx:
            simbolo_moneda = simbolo(conn)
            insert_tx(
                conn, fecha=body.fecha or ahora_bogota(), tipo="transfer", categoria=CAT_TRANSFER["pago_deuda"],
                descripcion=body.descripcion or frases.descripcion_pago(
                    deuda["nombre"], desglose["capital"], intereses, simbolo_moneda
                ),
                monto=body.total_pagado, notas=body.notas,
            )
        if body.op_clave:
            ocultar_op(conn, body.op_clave)
        conn.commit()
        return _fila_deuda(conn, deuda_id)


@router.post("/api/deuda/{deuda_id}/adelanto")
def pedir_adelanto(deuda_id: int, body: DeudaAdelanto):
    with conexion() as conn:
        tarjeta = get_row(conn, "deudas", deuda_id)
        nuevo_saldo = _saldo_tras_adelanto(tarjeta, body)
        movimientos.validar_adelanto(bool(tarjeta["es_tarjeta"]), tarjeta["saldo_actual"], nuevo_saldo)
        conn.execute("UPDATE deudas SET saldo_actual = ? WHERE id = ?", (pesos(nuevo_saldo), deuda_id))
        if body.registrar_tx:
            insert_tx(
                conn, fecha=body.fecha or ahora_bogota(), tipo="ingreso", categoria=CAT_INGRESO["avance_tarjeta"],
                descripcion=body.descripcion or frases.descripcion_adelanto(tarjeta["nombre"]),
                monto=body.monto, notas=body.notas,
            )
        conn.commit()
        logger.info(
            "tarjeta %s: adelanto %.2f, saldo_actual %.2f -> %.2f",
            deuda_id, body.monto, tarjeta["saldo_actual"], nuevo_saldo,
        )
        return _fila_deuda(conn, deuda_id)


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
        resumen = operaciones.resumen_deudas(coleccion(conn, "deudas"))
        return frases.con_frases(resumen, simbolo(conn))
