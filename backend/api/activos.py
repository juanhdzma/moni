from fastapi import APIRouter

from ..calculos import operaciones
from ..core.db import conexion
from ..core.estado import coleccion
from ..core.sql import get_row, insert_tx
from ..core.tablas import ACTIVO_COLS, CAT_GASTO, CAT_INGRESO
from ..schemas.activo import ActivoIn, ActivoVenta
from ..schemas.previews import NuevoValor, PrecioPreview
from .crud import register_crud

router = APIRouter()

register_crud(router, "activo", "activos", ACTIVO_COLS, ActivoIn, linked_tx={
    "tipo": "gasto", "categoria": CAT_GASTO["compra_activos"], "fecha_field": "fecha_adquisicion",
    "desc_fn": lambda d: f"Compra · {d['nombre']}",
    "monto_fn": lambda d: d["valor_inicial"],
})


@router.post("/api/activo/{activo_id}/venta")
def vender_activo(activo_id: int, body: ActivoVenta):
    with conexion() as conn:
        activo = get_row(conn, "activos", activo_id)
        conn.execute("DELETE FROM activos WHERE id = ?", (activo_id,))
        if body.registrar_tx:
            insert_tx(
                conn, fecha=body.fecha, tipo="ingreso", categoria=CAT_INGRESO["venta_activos"],
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
        return operaciones.resumen_activos(coleccion(conn, "activos"))
