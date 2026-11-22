import asyncio
import datetime
import logging
from typing import Optional
from zoneinfo import ZoneInfo

from ..core import db
from ..calculos.operaciones import operaciones_proximas
from . import envio

logger = logging.getLogger("moni")

TZ = ZoneInfo("America/Bogota")
HORA_AVISO = 8


def operaciones_del_dia(conn, hoy: datetime.date, dias: int = 1):
    return operaciones_proximas(
        [dict(r) for r in conn.execute("SELECT * FROM deudas")],
        [dict(r) for r in conn.execute("SELECT * FROM inversiones")],
        [dict(r) for r in conn.execute("SELECT * FROM recurrentes")],
        hoy,
        dias,
    )


def _monto(m: float) -> str:
    return f"{'+' if m > 0 else '-'}${abs(m):,.0f}".replace(",", ".")


def armar_mensaje(ops: list[tuple[datetime.date, str, float]], hoy: datetime.date) -> dict:
    lineas = [f"{'Hoy' if f == hoy else 'Mañana'}: {nombre} {_monto(m)}" for f, nombre, m in ops]
    titulo = "Moni" if len(ops) == 1 else f"Moni: {len(ops)} operaciones"
    return {"title": titulo, "body": "\n".join(lineas)}


def avisar(hoy: Optional[datetime.date] = None) -> int:
    hoy = hoy or datetime.datetime.now(TZ).date()
    conn = db.get_conn()
    try:
        ops = operaciones_del_dia(conn, hoy)
    finally:
        conn.close()
    if not ops:
        return 0
    mensaje = armar_mensaje(ops, hoy)
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
        await asyncio.sleep(segundos_hasta_aviso(datetime.datetime.now(TZ)))
        try:
            await asyncio.to_thread(avisar)
        except Exception:
            logger.exception("push diario falló")
