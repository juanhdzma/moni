import logging
from typing import Literal, Optional
from fastapi import APIRouter, HTTPException

from ..calculos import listados
from ..calculos.fechas import ahora_bogota, hoy_bogota
from ..core.db import conexion
from ..core import estado as store
from ..core.estado import coleccion
from ..core.montos import pesos
from ..core.ops_ocultas import ocultar_op
from ..core.sql import delete_row, get_row, insert_row, update_row
from ..core.tablas import TX_COLS
from ..schemas.transaccion import TxIn
from ..schemas.validadores import ColumnaTx
from .crud import register_lectura

logger = logging.getLogger("moni")
router = APIRouter()
register_lectura(router, "tx", "transacciones")


def ajustar_saldo_tarjeta(conn, tarjeta_id, delta):
    if tarjeta_id is None or delta == 0:
        return
    tarjeta = conn.execute("SELECT * FROM deudas WHERE id = ?", (tarjeta_id,)).fetchone()
    if tarjeta is None:
        logger.warning("tx apunta a tarjeta %s inexistente; se ignora el ajuste de saldo", tarjeta_id)
        return
    if not tarjeta["es_tarjeta"]:
        raise HTTPException(400, f"tarjeta_id {tarjeta_id} no es una tarjeta válida")
    nuevo_saldo = pesos(tarjeta["saldo_actual"] + delta)
    conn.execute("UPDATE deudas SET saldo_actual = ? WHERE id = ?", (nuevo_saldo, tarjeta_id))
    logger.info(
        "tarjeta %s: saldo_actual %.2f -> %.2f (delta %.2f)",
        tarjeta_id, tarjeta["saldo_actual"], nuevo_saldo, delta,
    )


def _deshacer_efecto_en_tarjeta(conn, tx):
    if tx["tipo"] == "gasto":
        ajustar_saldo_tarjeta(conn, tx["tarjeta_id"], -tx["monto"])


def _aplicar_efecto_en_tarjeta(conn, tx):
    if tx["tipo"] == "gasto":
        ajustar_saldo_tarjeta(conn, tx["tarjeta_id"], tx["monto"])


@router.post("/api/tx", name="create_tx")
def create_tx(body: TxIn):
    with conexion() as conn:
        data = body.model_dump()
        new_id = insert_row(conn, "transacciones", TX_COLS, data)
        _aplicar_efecto_en_tarjeta(conn, data)
        if data["op_clave"]:
            ocultar_op(conn, data["op_clave"])
        conn.commit()
        return get_row(conn, "transacciones", new_id)


@router.put("/api/tx/{row_id}", name="update_tx")
def update_tx(row_id: int, body: TxIn):
    with conexion() as conn:
        _deshacer_efecto_en_tarjeta(conn, get_row(conn, "transacciones", row_id))
        data = body.model_dump()
        update_row(conn, "transacciones", TX_COLS, row_id, data)
        _aplicar_efecto_en_tarjeta(conn, data)
        conn.commit()
        return get_row(conn, "transacciones", row_id)


@router.delete("/api/tx/{row_id}", status_code=204, name="delete_tx")
def delete_tx(row_id: int):
    with conexion() as conn:
        _deshacer_efecto_en_tarjeta(conn, get_row(conn, "transacciones", row_id))
        delete_row(conn, "transacciones", row_id)
        conn.commit()


@router.get("/api/tx/opciones")
def opciones_tx(tx_id: Optional[int] = None):
    with conexion() as conn:
        tx = get_row(conn, "transacciones", tx_id) if tx_id is not None else None
        return listados.opciones_tx(
            store.categorias(conn), coleccion(conn, "deudas"), tx, ahora_bogota()
        )


@router.get("/api/tx")
def listar_tx(
    col: ColumnaTx = "fecha",
    dir: Literal["1", "-1"] = "-1",
    tipo: str = "",
    mes: str = "",
    cat: str = "",
):
    with conexion() as conn:
        hoy = hoy_bogota()
        return listados.listar_transacciones(coleccion(conn, "transacciones"), col, int(dir), tipo, mes, cat, hoy)
