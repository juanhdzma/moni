from fastapi import APIRouter

from ..calculos import operaciones
from ..calculos.fechas import hoy_bogota
from ..calculos.operaciones import asientos, movimientos, textos
from ..calculos.operaciones.movimientos import CambioInversion
from ..core.actualizar import actualizar_columnas
from ..core.db import conexion
from ..core.estado import coleccion, simbolo
from ..core.ops_ocultas import ocultar_op
from ..core.sql import delete_row, get_row, guardar_y_leer, insert_row, insert_tx, update_row
from ..core.tablas import INV_COLS
from ..schemas.inversion import InvAporte, InvIn, InvRendimiento, InvRetiro, InvValor
from ..schemas.previews import MontoPreview, NuevoValor
from .lecturas import register_borrado, register_lectura

router = APIRouter()
register_lectura(router, "inv", "inversiones")
register_borrado(router, "inv", "inversiones")

DESCRIPCION_RENDIMIENTO = "Un rendimiento cuenta de un solo lado: si capitaliza sube valor_actual sin transacción; si se paga, es un ingreso y el valor no cambia."


def _datos_inversion(body: InvIn, anterior: dict | None) -> dict:
    data = operaciones.normalizar_tasa(body.model_dump())
    return operaciones.completar_inversion(data, anterior, hoy_bogota())


@router.post("/api/inv", name="create_inv")
def crear_inv(body: InvIn):
    with conexion() as conn:
        data = _datos_inversion(body, None)
        crear_tx = data.pop("crear_tx")
        new_id = insert_row(conn, "inversiones", INV_COLS, data)
        if crear_tx:
            insert_tx(conn, **asientos.tx_inversion_nueva(data))
        return guardar_y_leer(conn, "inversiones", new_id)


@router.put("/api/inv/{row_id}", name="update_inv")
def actualizar_inv(row_id: int, body: InvIn):
    with conexion() as conn:
        data = _datos_inversion(body, get_row(conn, "inversiones", row_id))
        data.pop("crear_tx")
        update_row(conn, "inversiones", INV_COLS, row_id, data)
        return guardar_y_leer(conn, "inversiones", row_id)


def _persistir(conn, inv_id: int, cambio: CambioInversion) -> None:
    if cambio.borrar:
        delete_row(conn, "inversiones", inv_id)
    else:
        actualizar_columnas(conn, "inversiones", inv_id, cambio.cambios)
    if cambio.tx:
        insert_tx(conn, **cambio.tx)


@router.post("/api/inv/{inv_id}/rendimiento", description=DESCRIPCION_RENDIMIENTO)
def registrar_rendimiento(inv_id: int, body: InvRendimiento):
    with conexion() as conn:
        inv = get_row(conn, "inversiones", inv_id)
        _persistir(conn, inv_id, movimientos.aplicar_rendimiento(
            inv, body.monto, body.fecha, body.notas, body.capitaliza, body.registrar_tx
        ))
        if body.op_clave:
            ocultar_op(conn, body.op_clave)
        return guardar_y_leer(conn, "inversiones", inv_id)


@router.post("/api/inv/{inv_id}/aporte")
def aportar_inv(inv_id: int, body: InvAporte):
    with conexion() as conn:
        inv = get_row(conn, "inversiones", inv_id)
        _persistir(conn, inv_id, movimientos.aplicar_aporte(
            inv, body.monto, body.nuevo_valor, body.fecha, body.notas, body.registrar_tx
        ))
        return guardar_y_leer(conn, "inversiones", inv_id)


@router.post("/api/inv/{inv_id}/retiro")
def retirar_inv(inv_id: int, body: InvRetiro):
    with conexion() as conn:
        inv = get_row(conn, "inversiones", inv_id)
        _persistir(conn, inv_id, movimientos.aplicar_retiro(
            inv, body.tipo, body.monto, body.saldo_queda, body.fecha, body.notas, body.registrar_tx
        ))
        conn.commit()
        return {"ok": True}


@router.post("/api/inv/{inv_id}/valor")
def actualizar_valor_inv(inv_id: int, body: InvValor):
    with conexion() as conn:
        get_row(conn, "inversiones", inv_id)
        cambios = movimientos.aplicar_valor(body.nuevo_valor, body.fecha or hoy_bogota().isoformat())
        actualizar_columnas(conn, "inversiones", inv_id, cambios)
        return guardar_y_leer(conn, "inversiones", inv_id)


@router.post("/api/inv/{inv_id}/valor/preview")
def inv_valor_preview(inv_id: int, body: NuevoValor):
    with conexion() as conn:
        inv = get_row(conn, "inversiones", inv_id)
        return operaciones.cambio_valor(body.nuevo_valor, inv["valor_actual"], inv["monto_invertido"])


@router.post("/api/inv/{inv_id}/aporte/preview")
def inv_aporte_preview(inv_id: int, body: MontoPreview):
    with conexion() as conn:
        inv = get_row(conn, "inversiones", inv_id)
        estimado = movimientos.valor_estimado_tras_aporte(inv["valor_actual"], body.monto)
        return {
            "nuevo_valor_estimado": estimado,
            "texto_estimado": textos.texto_estimado_aporte(estimado if body.monto > 0 else None, simbolo(conn)),
        }


@router.get("/api/inv/resumen")
def inv_resumen():
    with conexion() as conn:
        resumen = operaciones.resumen_inversiones(coleccion(conn, "inversiones", hoy_bogota()), simbolo(conn))
    resumen["texto_posiciones"] = operaciones.texto_posiciones(resumen)
    return resumen
