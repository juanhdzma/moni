import asyncio
import datetime
import logging
from typing import Optional

from ..calculos.fechas import ahora_bogota, hoy_bogota
from ..calculos.formato import cop
from ..calculos.operaciones.proximas import en_ventana, sin_ocultas
from ..core import db
from ..core.estado import ajustes
from ..core.ops_ocultas import candidatas, claves_ocultas
from . import envio

logger = logging.getLogger("moni")

HORA_AVISO = 8


def operaciones_del_dia(conn, hoy: datetime.date, dias: int = 1) -> list[tuple[datetime.date, str, float]]:
    visibles = sin_ocultas(candidatas(conn, hoy), claves_ocultas(conn))
    return [(c["fecha"], c["etiqueta"], c["monto"]) for c in en_ventana(visibles, hoy, dias)]


def _monto(m: float, simbolo: str) -> str:
    return ("+" if m > 0 else "-") + cop(abs(m), simbolo)


def armar_mensaje(ops: list[tuple[datetime.date, str, float]], hoy: datetime.date, simbolo: str = "$") -> dict:
    lineas = [f"{'Hoy' if f == hoy else 'Mañana'}: {nombre} {_monto(m, simbolo)}" for f, nombre, m in ops]
    titulo = "Moni" if len(ops) == 1 else f"Moni: {len(ops)} operaciones"
    return {"title": titulo, "body": "\n".join(lineas)}


def avisar(hoy: Optional[datetime.date] = None) -> int:
    hoy = hoy or hoy_bogota()
    with db.conexion() as conn:
        ops = operaciones_del_dia(conn, hoy)
        simbolo = ajustes(conn)["moneda_simbolo"]
    if not ops:
        return 0
    mensaje = armar_mensaje(ops, hoy, simbolo)
    enviadas = envio.enviar_a_todos(mensaje["title"], mensaje["body"])["enviadas"]
    logger.info("push diario: %d operaciones, %d enviadas", len(ops), enviadas)
    return enviadas


def segundos_hasta_aviso(ahora: datetime.datetime) -> float:
    prox = ahora.replace(hour=HORA_AVISO, minute=0, second=0, microsecond=0)
    if prox <= ahora:
        prox += datetime.timedelta(days=1)
    return (prox - ahora).total_seconds()


async def loop_diario():
    while True:
        await asyncio.sleep(segundos_hasta_aviso(ahora_bogota()))
        try:
            await asyncio.to_thread(avisar)
        except Exception:
            logger.exception("push diario falló")
