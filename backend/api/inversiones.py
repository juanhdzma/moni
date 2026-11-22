from fastapi import APIRouter, HTTPException

from ..calculos import operaciones
from ..core.db import conexion
from ..core.estado import coleccion
from ..core.montos import pesos
from ..core.ops_ocultas import ocultar_op
from ..core.sql import get_row, insert_tx
from ..core.tablas import CAT_GASTO, CAT_INGRESO, INV_COLS
from ..schemas.inversion import InvAporte, InvIn, InvRendimiento, InvRetiro
from ..schemas.previews import MontoPreview, NuevoValor
from .crud import register_crud

router = APIRouter()

DESCRIPCION_RENDIMIENTO = (
    "Un rendimiento cuenta de UN solo lado, nunca de los dos.\n\n"
    "Antes esto subía valor_actual y además insertaba el ingreso, así que el\n"
    "patrimonio subía dos veces por el mismo peso: un CDT de 1.000.000 que paga\n"
    "95.000 quedaba mostrando 1.190.000. Si capitaliza, la plata sigue adentro de\n"
    "la inversión y no entró a la cartera; si te la pagan, salió de la inversión\n"
    "y su valor no se mueve."
)

register_crud(router, "inv", "inversiones", INV_COLS, InvIn, linked_tx={
    "tipo": "gasto", "categoria": CAT_GASTO["inversion"], "fecha_field": "fecha_inicio",
    "desc_fn": lambda d: f"Nueva inversión · {d['nombre']}",
    "monto_fn": lambda d: d["monto_invertido"],
})


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
        conn.execute(
            "UPDATE inversiones SET monto_invertido = ?, valor_actual = ?, valor_actualizado_en = ? WHERE id = ?",
            (pesos(inv["monto_invertido"] + body.monto), pesos(body.nuevo_valor), body.fecha, inv_id),
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
            conn.execute("DELETE FROM inversiones WHERE id = ?", (inv_id,))
            descripcion = f"Retiro total · {inv['nombre']}"
        else:
            if body.saldo_queda is None:
                raise HTTPException(400, "saldo_queda requerido para retiro parcial")
            if body.saldo_queda > inv["valor_actual"]:
                raise HTTPException(400, "El saldo que queda no puede superar el valor actual")
            pct_retiro = (body.monto / inv["valor_actual"]) if inv["valor_actual"] > 0 else 0
            nuevo_invertido = pesos(max(0.0, inv["monto_invertido"] * (1 - pct_retiro)))
            conn.execute(
                "UPDATE inversiones SET valor_actual = ?, monto_invertido = ?, valor_actualizado_en = ? WHERE id = ?",
                (pesos(body.saldo_queda), nuevo_invertido, body.fecha, inv_id),
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
        return {"nuevo_valor_estimado": inv["valor_actual"] + body.monto}


@router.get("/api/inv/resumen")
def inv_resumen():
    with conexion() as conn:
        return operaciones.resumen_inversiones(coleccion(conn, "inversiones"))
