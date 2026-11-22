import datetime

from fastapi import APIRouter

from ..calculos import operaciones
from ..calculos.fechas import TZ, hoy_bogota
from ..calculos.numeros import porcentaje
from ..core.db import conexion
from ..core.estado import coleccion
from ..core.sql import delete_row, get_row, insert_row, insert_tx, update_row
from ..core.tablas import ACTIVO_COLS, CAT_GASTO, CAT_INGRESO
from ..schemas.activo import ActivoIn, ActivoValor, ActivoVenta
from ..schemas.previews import NuevoValor, PrecioPreview

router = APIRouter()


def _ahora_bogota() -> str:
    return datetime.datetime.now(TZ).strftime("%Y-%m-%dT%H:%M")


def _formato_pct(valor: float) -> str:
    return f"{abs(valor):.1f}".replace(".", ",")


def _datos_activo(body: ActivoIn, anterior: dict | None) -> dict:
    datos = body.model_dump(exclude={"crear_tx"})
    datos["valor_actual"] = body.valor_actual or body.valor_inicial
    datos["fecha_adquisicion"] = (
        body.fecha_adquisicion or (anterior or {}).get("fecha_adquisicion") or hoy_bogota().isoformat()
    )
    if not body.valor_actualizado_en:
        if anterior is None:
            datos["valor_actualizado_en"] = datos["fecha_adquisicion"]
        elif anterior["valor_actual"] == datos["valor_actual"]:
            datos["valor_actualizado_en"] = anterior["valor_actualizado_en"]
        else:
            datos["valor_actualizado_en"] = _ahora_bogota()
    return datos


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


@router.delete("/api/activo/{activo_id}", status_code=204, name="delete_activo")
def borrar_activo(activo_id: int):
    with conexion() as conn:
        delete_row(conn, "activos", activo_id)
        conn.commit()


@router.post("/api/activo/{activo_id}/valor")
def actualizar_valor(activo_id: int, body: ActivoValor):
    with conexion() as conn:
        get_row(conn, "activos", activo_id)
        conn.execute(
            "UPDATE activos SET valor_actual = ?, valor_actualizado_en = ? WHERE id = ?",
            (body.nuevo_valor, body.fecha or _ahora_bogota(), activo_id),
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
                conn, fecha=body.fecha or _ahora_bogota(), tipo="ingreso", categoria=CAT_INGRESO["venta_activos"],
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
    return {
        **resumen,
        "texto_variacion": f"{_formato_pct(resumen['variacion_pct'])}% sobre lo pagado" if resumen["total_inicial"] > 0 else "",
        "texto_conteo": f"{len(activos)} activo{'' if len(activos) == 1 else 's'}",
    }
