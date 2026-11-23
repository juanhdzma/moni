from fastapi import APIRouter

from ..calculos import operaciones
from ..calculos.fechas import ahora_bogota_iso, hoy_bogota
from ..core.db import conexion
from ..core.estado import coleccion
from ..core.sql import delete_row, get_row, insert_row, insert_tx, update_row
from ..core.tablas import ACTIVO_COLS, CAT_GASTO, CAT_INGRESO
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
            insert_tx(
                conn, fecha=datos["fecha_adquisicion"], tipo="gasto", categoria=CAT_GASTO["compra_activos"],
                descripcion=f"Compra · {datos['nombre']}", monto=datos["valor_inicial"], notas="",
            )
        conn.commit()
        return get_row(conn, "activos", activo_id)


@router.put("/api/activo/{activo_id}", name="update_activo")
def actualizar_activo(activo_id: int, body: ActivoIn):
    with conexion() as conn:
        datos = _datos_activo(body, get_row(conn, "activos", activo_id))
        update_row(conn, "activos", ACTIVO_COLS, activo_id, datos)
        conn.commit()
        return get_row(conn, "activos", activo_id)


@router.post("/api/activo/{activo_id}/valor")
def actualizar_valor(activo_id: int, body: ActivoValor):
    with conexion() as conn:
        get_row(conn, "activos", activo_id)
        conn.execute(
            "UPDATE activos SET valor_actual = ?, valor_actualizado_en = ? WHERE id = ?",
            (body.nuevo_valor, body.fecha or ahora_bogota_iso(), activo_id),
        )
        conn.commit()
        return get_row(conn, "activos", activo_id)


@router.post("/api/activo/{activo_id}/venta")
def vender_activo(activo_id: int, body: ActivoVenta):
    with conexion() as conn:
        activo = get_row(conn, "activos", activo_id)
        delete_row(conn, "activos", activo_id)
        if body.registrar_tx:
            insert_tx(
                conn, fecha=body.fecha or ahora_bogota_iso(), tipo="ingreso", categoria=CAT_INGRESO["venta_activos"],
                descripcion=f"Venta · {activo['nombre']}", monto=body.precio, notas=body.notas,
            )
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
        activos = coleccion(conn, "activos")
    resumen = operaciones.resumen_activos(activos)
    return {**resumen, **operaciones.texto_activos(resumen, len(activos))}
