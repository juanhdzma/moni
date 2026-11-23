from fastapi import APIRouter

from ..calculos import operaciones
from ..core.db import conexion
from ..core.estado import coleccion, simbolo
from ..core.montos import pesos
from ..core.ops_ocultas import ocultar_op
from ..core.sql import delete_row, get_row, insert_row, insert_tx, update_row
from ..core.tablas import CAT_GASTO, CAT_INGRESO, INV_COLS
from ..schemas.inversion import InvAporte, InvIn, InvRendimiento, InvRetiro
from ..schemas.previews import MontoPreview, NuevoValor
from .lecturas import register_borrado, register_lectura
from ..calculos.fechas import hoy_bogota
from ..calculos.formato import plural
from ..calculos.operaciones.movimientos import retiro_parcial, valor_estimado_tras_aporte

router = APIRouter()
register_lectura(router, "inv", "inversiones")
register_borrado(router, "inv", "inversiones")

DESCRIPCION_RENDIMIENTO = (
    "Un rendimiento cuenta de UN solo lado, nunca de los dos.\n\n"
    "Antes esto subía valor_actual y además insertaba el ingreso, así que el\n"
    "patrimonio subía dos veces por el mismo peso: un CDT de 1.000.000 que paga\n"
    "95.000 quedaba mostrando 1.190.000. Si capitaliza, la plata sigue adentro de\n"
    "la inversión y no entró a la cartera; si te la pagan, salió de la inversión\n"
    "y su valor no se mueve."
)


def _datos_inversion(body: InvIn, hoy) -> dict:
    data = operaciones.normalizar_tasa(body.model_dump())
    if data["valor_actual"] is None:
        data["valor_actual"] = data["monto_invertido"]
    data["fecha_inicio"] = data["fecha_inicio"] or hoy.isoformat()
    return data


@router.post("/api/inv", name="create_inv")
def crear_inv(body: InvIn):
    hoy = hoy_bogota()
    with conexion() as conn:
        data = _datos_inversion(body, hoy)
        data["valor_actualizado_en"] = data["valor_actualizado_en"] or data["fecha_inicio"]
        crear_tx = data.pop("crear_tx")
        new_id = insert_row(conn, "inversiones", INV_COLS, data)
        if crear_tx:
            insert_tx(
                conn, fecha=data["fecha_inicio"], tipo="gasto", categoria=CAT_GASTO["inversion"],
                descripcion=f"Nueva inversión · {data['nombre']}", monto=data["monto_invertido"], notas="",
            )
        conn.commit()
        return get_row(conn, "inversiones", new_id)


@router.put("/api/inv/{row_id}", name="update_inv")
def actualizar_inv(row_id: int, body: InvIn):
    hoy = hoy_bogota()
    with conexion() as conn:
        anterior = get_row(conn, "inversiones", row_id)
        data = _datos_inversion(body, hoy)
        data.pop("crear_tx")
        if not data["valor_actualizado_en"]:
            mismo_valor = anterior["valor_actual"] == data["valor_actual"]
            data["valor_actualizado_en"] = anterior["valor_actualizado_en"] if mismo_valor else hoy.isoformat()
        update_row(conn, "inversiones", INV_COLS, row_id, data)
        conn.commit()
        return get_row(conn, "inversiones", row_id)


@router.post("/api/inv/{inv_id}/rendimiento", description=DESCRIPCION_RENDIMIENTO)
def registrar_rendimiento(inv_id: int, body: InvRendimiento):
    with conexion() as conn:
        inv = get_row(conn, "inversiones", inv_id)
        if body.capitaliza:
            conn.execute(
                "UPDATE inversiones SET valor_actual = ?, valor_actualizado_en = ? WHERE id = ?",
                (pesos(inv["valor_actual"] + body.monto), body.fecha, inv_id),
            )
        elif body.registrar_tx:
            insert_tx(
                conn, fecha=body.fecha, tipo="ingreso", categoria=CAT_INGRESO["intereses"],
                descripcion=f"Rendimiento · {inv['nombre']}", monto=body.monto, notas=body.notas,
            )
        if body.op_clave:
            ocultar_op(conn, body.op_clave)
        conn.commit()
        return get_row(conn, "inversiones", inv_id)


@router.post("/api/inv/{inv_id}/aporte")
def aportar_inv(inv_id: int, body: InvAporte):
    with conexion() as conn:
        inv = get_row(conn, "inversiones", inv_id)
        nuevo_valor = body.nuevo_valor
        if nuevo_valor is None:
            nuevo_valor = valor_estimado_tras_aporte(inv["valor_actual"], body.monto)
        conn.execute(
            "UPDATE inversiones SET monto_invertido = ?, valor_actual = ?, valor_actualizado_en = ? WHERE id = ?",
            (pesos(inv["monto_invertido"] + body.monto), pesos(nuevo_valor), body.fecha, inv_id),
        )
        if body.registrar_tx:
            insert_tx(
                conn, fecha=body.fecha, tipo="gasto", categoria=CAT_GASTO["inversion"],
                descripcion=f"Aporte · {inv['nombre']}", monto=body.monto, notas=body.notas,
            )
        conn.commit()
        return get_row(conn, "inversiones", inv_id)


@router.post("/api/inv/{inv_id}/retiro")
def retirar_inv(inv_id: int, body: InvRetiro):
    with conexion() as conn:
        inv = get_row(conn, "inversiones", inv_id)
        if body.tipo == "total":
            delete_row(conn, "inversiones", inv_id)
            descripcion = f"Retiro total · {inv['nombre']}"
        else:
            nuevo = retiro_parcial(inv["valor_actual"], inv["monto_invertido"], body.monto, body.saldo_queda)
            conn.execute(
                "UPDATE inversiones SET valor_actual = ?, monto_invertido = ?, valor_actualizado_en = ? WHERE id = ?",
                (nuevo.valor_actual, nuevo.monto_invertido, body.fecha, inv_id),
            )
            descripcion = f"Retiro parcial · {inv['nombre']}"
        if body.registrar_tx:
            insert_tx(
                conn, fecha=body.fecha, tipo="ingreso", categoria=CAT_INGRESO["dividendos"],
                descripcion=descripcion, monto=body.monto, notas=body.notas,
            )
        conn.commit()
        return {"ok": True}


@router.post("/api/inv/{inv_id}/valor/preview")
def inv_valor_preview(inv_id: int, body: NuevoValor):
    with conexion() as conn:
        inv = get_row(conn, "inversiones", inv_id)
        return operaciones.cambio_valor(body.nuevo_valor, inv["valor_actual"], inv["monto_invertido"])


@router.post("/api/inv/{inv_id}/aporte/preview")
def inv_aporte_preview(inv_id: int, body: MontoPreview):
    with conexion() as conn:
        inv = get_row(conn, "inversiones", inv_id)
        return {"nuevo_valor_estimado": valor_estimado_tras_aporte(inv["valor_actual"], body.monto)}


@router.get("/api/inv/resumen")
def inv_resumen():
    with conexion() as conn:
        resumen = operaciones.resumen_inversiones(coleccion(conn, "inversiones"), simbolo(conn))
    posiciones = len(resumen["fijas"]) + len(resumen["variables"])
    resumen["texto_posiciones"] = plural(posiciones, "posición", "posiciones")
    return resumen
