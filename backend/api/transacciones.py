import logging
from typing import Literal, Optional
from fastapi import APIRouter, Response

from ..calculos import listados
from ..calculos.fechas import ahora_bogota_iso, hoy_bogota
from ..calculos.operaciones import tarjetas
from ..core.afectadas import DEUDAS, OPS_OCULTAS, TRANSACCIONES, afectar
from ..core.db import conexion
from ..core import estado as store
from ..core.estado import coleccion
from ..core.ops_ocultas import ocultar_op
from ..core.sql import delete_row, get_row, guardar_y_leer, insert_row, iniciar_escritura, sumar_al_saldo, update_row
from ..core.tablas import TX_COLS
from ..schemas.respuestas.transacciones import ListadoTx, OpcionesTx, Tx, TxCruda
from ..schemas.transaccion import TxIn
from ..schemas.validadores import ColumnaTx, TipoTx
from .lecturas import register_lectura

logger = logging.getLogger("moni")
router = APIRouter()
register_lectura(router, "tx", "transacciones", Tx)


def ajustar_saldo_tarjeta(conn, tarjeta_id, delta):
    if tarjeta_id is None or delta == 0:
        return
    iniciar_escritura(conn)
    tarjeta = _leer_tarjeta(conn, tarjeta_id)
    if tarjeta is None:
        logger.warning("tx apunta a tarjeta %s inexistente; se ignora el ajuste de saldo", tarjeta_id)
        return
    nuevo_saldo = tarjetas.saldo_tras_delta(tarjeta, delta)
    sumar_al_saldo(conn, tarjeta_id, delta)
    logger.info(
        "tarjeta %s: saldo_actual %.2f -> %.2f (delta %.2f)",
        tarjeta_id, tarjeta["saldo_actual"], nuevo_saldo, delta,
    )


def _leer_tarjeta(conn, tarjeta_id):
    fila = conn.execute("SELECT * FROM deudas WHERE id = ?", (tarjeta_id,)).fetchone()
    return None if fila is None else dict(fila)


def _exigir_tarjeta(conn, tarjeta_id):
    if tarjeta_id is not None:
        tarjetas.validar_tarjeta(_leer_tarjeta(conn, tarjeta_id))


def _deshacer_efecto_en_tarjeta(conn, tx):
    ajustar_saldo_tarjeta(conn, tx["tarjeta_id"], tarjetas.delta_saldo_tarjeta(tx, deshacer=True))


def _aplicar_efecto_en_tarjeta(conn, tx):
    ajustar_saldo_tarjeta(conn, tx["tarjeta_id"], tarjetas.delta_saldo_tarjeta(tx))


def afectar_tx(response: Response, tarjetas: tuple, op_clave: Optional[str] = None) -> None:
    entidades = [TRANSACCIONES]
    if any(t is not None for t in tarjetas):
        entidades.append(DEUDAS)
    if op_clave:
        entidades.append(OPS_OCULTAS)
    afectar(response, *entidades)


@router.post("/api/tx", name="create_tx", response_model=TxCruda)
def create_tx(body: TxIn, response: Response):
    with conexion() as conn:
        data = body.model_dump()
        _exigir_tarjeta(conn, data["tarjeta_id"])
        new_id = insert_row(conn, "transacciones", TX_COLS, data)
        _aplicar_efecto_en_tarjeta(conn, data)
        ocultar_op(conn, data["op_clave"])
        afectar_tx(response, (data["tarjeta_id"],), data["op_clave"])
        return guardar_y_leer(conn, "transacciones", new_id)


@router.put("/api/tx/{row_id:int}", name="update_tx", response_model=TxCruda)
def update_tx(row_id: int, body: TxIn, response: Response):
    with conexion() as conn:
        anterior = get_row(conn, "transacciones", row_id)
        data = body.model_dump()
        _exigir_tarjeta(conn, data["tarjeta_id"])
        _deshacer_efecto_en_tarjeta(conn, anterior)
        update_row(conn, "transacciones", TX_COLS, row_id, data)
        _aplicar_efecto_en_tarjeta(conn, data)
        afectar_tx(response, (anterior["tarjeta_id"], data["tarjeta_id"]))
        return guardar_y_leer(conn, "transacciones", row_id)


@router.delete("/api/tx/{row_id:int}", status_code=204, name="delete_tx")
def delete_tx(row_id: int, response: Response):
    with conexion() as conn:
        anterior = get_row(conn, "transacciones", row_id)
        _deshacer_efecto_en_tarjeta(conn, anterior)
        delete_row(conn, "transacciones", row_id)
        conn.commit()
        afectar_tx(response, (anterior["tarjeta_id"],))


@router.get("/api/tx/opciones", response_model=OpcionesTx)
def opciones_tx(tx_id: Optional[int] = None):
    with conexion() as conn:
        tx = get_row(conn, "transacciones", tx_id) if tx_id is not None else None
        return listados.opciones_tx(
            store.categorias(conn), coleccion(conn, "deudas", hoy_bogota()), tx, ahora_bogota_iso()
        )


@router.get("/api/tx", response_model=ListadoTx)
def listar_tx(
    col: ColumnaTx = "fecha",
    dir: Literal["1", "-1"] = "-1",
    tipo: TipoTx | Literal[""] = "",
    mes: str = "",
    cat: str = "",
):
    with conexion() as conn:
        hoy = hoy_bogota()
        return listados.listar_transacciones(
            coleccion(conn, "transacciones", hoy), col, int(dir), tipo, mes, cat, hoy, store.simbolo(conn)
        )
