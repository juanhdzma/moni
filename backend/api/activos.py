from fastapi import APIRouter

from ..calculos import operaciones
from ..calculos.operaciones import asientos, movimientos
from ..calculos.fechas import ahora_bogota_iso, hoy_bogota
from ..calculos.operaciones.defaults import fecha_o_ahora
from ..core.actualizar import actualizar_columnas
from ..core.db import conexion
from ..core.estado import coleccion
from ..core.sql import delete_row, get_row, guardar_y_leer, insert_row, insert_tx, update_row
from ..core.tablas import ACTIVO_COLS
from ..schemas.activo import ActivoIn, ActivoValor, ActivoVenta
from ..schemas.previews import NuevoValor, PrecioPreview
from .lecturas import register_borrado

router = APIRouter()
register_borrado(router, "activo", "activos")


def _datos_activo(body: ActivoIn, anterior: dict | None) -> dict:
    datos = body.model_dump(exclude={"crear_tx"})
    return operaciones.completar_activo(datos, anterior, hoy_bogota(), ahora_bogota_iso())


@router.post("/api/activo", name="create_activo")
def crear_activo(body: ActivoIn):
    with conexion() as conn:
        datos = _datos_activo(body, None)
        activo_id = insert_row(conn, "activos", ACTIVO_COLS, datos)
        if body.crear_tx:
            insert_tx(conn, **asientos.tx_compra_activo(datos))
        return guardar_y_leer(conn, "activos", activo_id)


@router.put("/api/activo/{activo_id}", name="update_activo")
def actualizar_activo(activo_id: int, body: ActivoIn):
    with conexion() as conn:
        datos = _datos_activo(body, get_row(conn, "activos", activo_id))
        update_row(conn, "activos", ACTIVO_COLS, activo_id, datos)
        return guardar_y_leer(conn, "activos", activo_id)


@router.post("/api/activo/{activo_id}/valor")
def actualizar_valor(activo_id: int, body: ActivoValor):
    with conexion() as conn:
        get_row(conn, "activos", activo_id)
        actualizar_columnas(conn, "activos", activo_id, movimientos.aplicar_valor(body.nuevo_valor, fecha_o_ahora(body.fecha)))
        return guardar_y_leer(conn, "activos", activo_id)


@router.post("/api/activo/{activo_id}/venta")
def vender_activo(activo_id: int, body: ActivoVenta):
    with conexion() as conn:
        activo = get_row(conn, "activos", activo_id)
        delete_row(conn, "activos", activo_id)
        if body.registrar_tx:
            insert_tx(conn, **asientos.tx_venta_activo(activo["nombre"], body.precio, fecha_o_ahora(body.fecha), body.notas))
        conn.commit()
        return {"ok": True}


@router.post("/api/activo/{activo_id}/valor/preview")
def activo_valor_preview(activo_id: int, body: NuevoValor):
    with conexion() as conn:
        activo = get_row(conn, "activos", activo_id)
        return operaciones.cambio_valor(body.nuevo_valor, activo["valor_actual"], activo["valor_inicial"])


@router.post("/api/activo/{activo_id}/venta/preview")
def activo_venta_preview(activo_id: int, body: PrecioPreview):
    with conexion() as conn:
        return operaciones.preview_venta_activo(get_row(conn, "activos", activo_id), body.precio)


@router.get("/api/activos/resumen")
def activos_resumen():
    with conexion() as conn:
        activos = coleccion(conn, "activos", hoy_bogota())
    return operaciones.resumen_activos(activos)
