from fastapi import APIRouter, Response

from ..calculos import operaciones
from ..calculos.fechas import ahora_bogota_iso, fecha_o_ahora, hoy_bogota
from ..calculos.operaciones import asientos, movimientos, textos
from ..calculos.operaciones.movimientos import CambioInversion
from ..core.afectadas import INVERSIONES, afectar, con_movimiento, con_op_oculta
from ..core.db import conexion
from ..core.estado import coleccion, simbolo
from ..core.ops_ocultas import ocultar_op
from ..core.sql import actualizar_columnas, delete_row, get_row, guardar_y_leer, insert_row, insert_tx, update_row, iniciar_escritura
from ..core.tablas import INV_COLS
from ..schemas.inversion import InvAporte, InvIn, InvRendimiento, InvRetiro, InvValor
from ..schemas.previews import MontoPreview, NuevoValor
from ..schemas.respuestas.comun import Ok, PreviewValor
from ..schemas.respuestas.inversiones import InvCruda, Inversion, PreviewAporte, ResumenInversiones
from .lecturas import register_borrado, register_lectura

router = APIRouter()
register_lectura(router, "inv", "inversiones", Inversion)
register_borrado(router, "inv", "inversiones", (INVERSIONES,))

def _datos_inversion(body: InvIn, anterior: dict | None) -> dict:
    data = operaciones.normalizar_tasa(body.model_dump(exclude={"crear_tx"}))
    return operaciones.completar_inversion(data, anterior, hoy_bogota(), ahora_bogota_iso())


@router.post("/api/inv", name="create_inv", response_model=InvCruda)
def crear_inv(body: InvIn, response: Response):
    with conexion() as conn:
        data = _datos_inversion(body, None)
        new_id = insert_row(conn, "inversiones", INV_COLS, data)
        if body.crear_tx:
            insert_tx(conn, **asientos.tx_inversion_nueva(data))
        afectar(response, *con_movimiento(INVERSIONES, body.crear_tx))
        return guardar_y_leer(conn, "inversiones", new_id)


@router.put("/api/inv/{row_id:int}", name="update_inv", response_model=InvCruda)
def actualizar_inv(row_id: int, body: InvIn, response: Response):
    with conexion() as conn:
        data = _datos_inversion(body, get_row(conn, "inversiones", row_id))
        update_row(conn, "inversiones", INV_COLS, row_id, data)
        afectar(response, INVERSIONES)
        return guardar_y_leer(conn, "inversiones", row_id)


def _persistir(conn, inv_id: int, cambio: CambioInversion) -> tuple[str, ...]:
    if cambio.borrar:
        delete_row(conn, "inversiones", inv_id)
    else:
        actualizar_columnas(conn, "inversiones", inv_id, cambio.cambios)
    if cambio.tx:
        insert_tx(conn, **cambio.tx)
    return con_movimiento(INVERSIONES, cambio.tx is not None)


@router.post("/api/inv/{inv_id:int}/rendimiento", description=textos.DESCRIPCION_RENDIMIENTO, response_model=InvCruda)
def registrar_rendimiento(inv_id: int, body: InvRendimiento, response: Response):
    with conexion() as conn:
        iniciar_escritura(conn)
        inv = get_row(conn, "inversiones", inv_id)
        afectadas = _persistir(conn, inv_id, movimientos.aplicar_rendimiento(
            inv, body.monto, fecha_o_ahora(body.fecha), body.notas, body.capitaliza, body.registrar_tx
        ))
        ocultar_op(conn, body.op_clave)
        afectar(response, *con_op_oculta(afectadas, body.op_clave))
        return guardar_y_leer(conn, "inversiones", inv_id)


@router.post("/api/inv/{inv_id:int}/aporte", response_model=InvCruda)
def aportar_inv(inv_id: int, body: InvAporte, response: Response):
    with conexion() as conn:
        iniciar_escritura(conn)
        inv = get_row(conn, "inversiones", inv_id)
        afectar(response, *_persistir(conn, inv_id, movimientos.aplicar_aporte(
            inv, body.monto, body.nuevo_valor, fecha_o_ahora(body.fecha), body.notas, body.registrar_tx
        )))
        return guardar_y_leer(conn, "inversiones", inv_id)


@router.post("/api/inv/{inv_id:int}/retiro", response_model=Ok)
def retirar_inv(inv_id: int, body: InvRetiro, response: Response):
    with conexion() as conn:
        iniciar_escritura(conn)
        inv = get_row(conn, "inversiones", inv_id)
        afectar(response, *_persistir(conn, inv_id, movimientos.aplicar_retiro(
            inv, body.tipo, body.monto, body.saldo_queda, fecha_o_ahora(body.fecha), body.notas, body.registrar_tx
        )))
        conn.commit()
        return {"ok": True}


@router.post("/api/inv/{inv_id:int}/valor", response_model=InvCruda)
def actualizar_valor_inv(inv_id: int, body: InvValor, response: Response):
    with conexion() as conn:
        iniciar_escritura(conn)
        get_row(conn, "inversiones", inv_id)
        cambios = movimientos.aplicar_valor(body.nuevo_valor, fecha_o_ahora(body.fecha))
        actualizar_columnas(conn, "inversiones", inv_id, cambios)
        afectar(response, INVERSIONES)
        return guardar_y_leer(conn, "inversiones", inv_id)


@router.post("/api/inv/{inv_id:int}/valor/preview", response_model=PreviewValor | None)
def inv_valor_preview(inv_id: int, body: NuevoValor):
    with conexion() as conn:
        inv = get_row(conn, "inversiones", inv_id)
        if not body.nuevo_valor:
            return None
        return operaciones.cambio_valor(body.nuevo_valor, inv["valor_actual"], inv["monto_invertido"])


@router.post("/api/inv/{inv_id:int}/aporte/preview", response_model=PreviewAporte | None)
def inv_aporte_preview(inv_id: int, body: MontoPreview):
    with conexion() as conn:
        inv = get_row(conn, "inversiones", inv_id)
        if not body.monto:
            return None
        estimado = movimientos.valor_estimado_tras_aporte(inv["valor_actual"], body.monto)
        return {
            "nuevo_valor_estimado": estimado,
            "texto_estimado": textos.texto_estimado_aporte(estimado, simbolo(conn)),
        }


@router.get("/api/inv/resumen", response_model=ResumenInversiones)
def inv_resumen():
    with conexion() as conn:
        return operaciones.resumen_inversiones(coleccion(conn, "inversiones", hoy_bogota()), simbolo(conn))
