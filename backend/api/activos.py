from fastapi import APIRouter, Response

from ..calculos import operaciones
from ..calculos.operaciones import asientos, movimientos
from ..calculos.base.fechas import ahora_bogota_iso, fecha_o_ahora, hoy_bogota
from ..core.afectadas import ACTIVOS, afectar, con_movimiento
from ..core.db import conexion
from ..core.estado import coleccion
from ..core.sql import actualizar_columnas, delete_row, get_row, guardar_y_leer, insert_row, insert_tx, update_row, iniciar_escritura
from ..core.sql import ACTIVO_COLS
from ..schemas.activo import ActivoIn, ActivoValor, ActivoVenta
from ..schemas.previews import NuevoValor, PrecioPreview
from ..schemas.respuestas.activos import Activo, ActivoCrudo, PreviewVenta, ResumenActivos
from ..schemas.respuestas.comun import Ok, PreviewValor
from .lecturas import register_borrado, register_lectura

router = APIRouter()
register_lectura(router, "activo", "activos", Activo)
register_borrado(router, "activo", "activos", (ACTIVOS,))


def _datos_activo(body: ActivoIn, anterior: dict | None) -> dict:
    datos = body.model_dump(exclude={"crear_tx"})
    return operaciones.completar_activo(datos, anterior, hoy_bogota(), ahora_bogota_iso())


@router.post("/api/activo", name="create_activo", response_model=ActivoCrudo)
def crear_activo(body: ActivoIn, response: Response):
    with conexion() as conn:
        datos = _datos_activo(body, None)
        activo_id = insert_row(conn, "activos", ACTIVO_COLS, datos)
        if body.crear_tx:
            insert_tx(conn, **asientos.tx_compra_activo(datos))
        afectar(response, *con_movimiento(ACTIVOS, body.crear_tx))
        return guardar_y_leer(conn, "activos", activo_id)


@router.put("/api/activo/{activo_id:int}", name="update_activo", response_model=ActivoCrudo)
def actualizar_activo(activo_id: int, body: ActivoIn, response: Response):
    with conexion() as conn:
        datos = _datos_activo(body, get_row(conn, "activos", activo_id))
        update_row(conn, "activos", ACTIVO_COLS, activo_id, datos)
        afectar(response, ACTIVOS)
        return guardar_y_leer(conn, "activos", activo_id)


@router.post("/api/activo/{activo_id:int}/valor", response_model=ActivoCrudo)
def actualizar_valor(activo_id: int, body: ActivoValor, response: Response):
    with conexion() as conn:
        iniciar_escritura(conn)
        get_row(conn, "activos", activo_id)
        actualizar_columnas(conn, "activos", activo_id, movimientos.aplicar_valor(body.nuevo_valor, fecha_o_ahora(body.fecha)))
        afectar(response, ACTIVOS)
        return guardar_y_leer(conn, "activos", activo_id)


@router.post("/api/activo/{activo_id:int}/venta", response_model=Ok)
def vender_activo(activo_id: int, body: ActivoVenta, response: Response):
    with conexion() as conn:
        iniciar_escritura(conn)
        activo = get_row(conn, "activos", activo_id)
        delete_row(conn, "activos", activo_id)
        if body.registrar_tx:
            insert_tx(conn, **asientos.tx_venta_activo(activo["nombre"], body.precio, fecha_o_ahora(body.fecha), body.notas))
        conn.commit()
        afectar(response, *con_movimiento(ACTIVOS, body.registrar_tx))
        return {"ok": True}


@router.post("/api/activo/{activo_id:int}/valor/preview", response_model=PreviewValor | None)
def activo_valor_preview(activo_id: int, body: NuevoValor):
    with conexion() as conn:
        activo = get_row(conn, "activos", activo_id)
        return operaciones.preview_cambio_valor(body.nuevo_valor, activo["valor_actual"], activo["valor_inicial"])


@router.post("/api/activo/{activo_id:int}/venta/preview", response_model=PreviewVenta | None)
def activo_venta_preview(activo_id: int, body: PrecioPreview):
    with conexion() as conn:
        activo = get_row(conn, "activos", activo_id)
        return operaciones.preview_venta_activo(activo, body.precio)


@router.get("/api/activos/resumen", response_model=ResumenActivos)
def activos_resumen():
    with conexion() as conn:
        activos = coleccion(conn, "activos", hoy_bogota())
    return operaciones.resumen_activos(activos)
