import asyncio
import datetime
import logging
import os
import weakref

from fastapi import Request
from fastapi.responses import JSONResponse

from . import tiempo
from ..core.db import conexion
from .ip import client_ip

logger = logging.getLogger("moni.auth")

VENTANA_FALLOS_S = 3600
MAX_FALLOS = 3
RETRASO_FALLO = 0.5

_locks: "weakref.WeakValueDictionary[str, asyncio.Lock]" = weakref.WeakValueDictionary()


def _horas_bloqueo() -> float:
    try:
        v = float(os.environ.get("MONI_BLOCK_HOURS", "24"))
        return v if v > 0 else 24.0
    except ValueError:
        return 24.0


def lock_ip(ip: str) -> asyncio.Lock:
    lock = _locks.get(ip)
    if lock is None:
        lock = _locks[ip] = asyncio.Lock()
    return lock


def ip_bloqueada(ip: str) -> int:
    with conexion() as conn:
        fila = conn.execute("SELECT hasta FROM ips_bloqueadas WHERE ip = ?", (ip,)).fetchone()
        if fila is None:
            return 0
        restante = (tiempo.desde_iso(fila["hasta"]) - tiempo.ahora()).total_seconds()
        if restante <= 0:
            conn.execute("DELETE FROM ips_bloqueadas WHERE ip = ?", (ip,))
            conn.commit()
            return 0
        return max(1, int(restante + 0.999))


def registrar_fallo(request: Request, motivo: str) -> bool:
    ip = client_ip(request)
    t = tiempo.ahora()
    with conexion() as conn:
        conn.execute("DELETE FROM intentos_fallidos WHERE ts < ?", (tiempo.iso(t - datetime.timedelta(seconds=VENTANA_FALLOS_S)),))
        conn.execute("DELETE FROM ips_bloqueadas WHERE hasta <= ?", (tiempo.iso(t),))
        conn.execute("INSERT INTO intentos_fallidos (ip, ts, motivo) VALUES (?, ?, ?)", (ip, tiempo.iso(t), motivo))
        n = conn.execute("SELECT COUNT(*) FROM intentos_fallidos WHERE ip = ?", (ip,)).fetchone()[0]
        bloquear = n >= MAX_FALLOS
        if bloquear:
            hasta = t + datetime.timedelta(hours=_horas_bloqueo())
            conn.execute(
                "INSERT OR REPLACE INTO ips_bloqueadas (ip, desde, hasta, motivo) VALUES (?, ?, ?, ?)",
                (ip, tiempo.iso(t), tiempo.iso(hasta), motivo),
            )
            conn.execute("DELETE FROM intentos_fallidos WHERE ip = ?", (ip,))
        conn.commit()
    logger.warning("fallo de autenticacion ip=%s motivo=%s intentos=%d", ip, motivo, n)
    if bloquear:
        logger.warning("ip bloqueada ip=%s motivo=%s", ip, motivo)
    return bloquear


async def fallo_generico(request: Request, motivo: str) -> JSONResponse:
    registrar_fallo(request, motivo)
    if RETRASO_FALLO:
        await asyncio.sleep(RETRASO_FALLO)
    return JSONResponse({"detail": "Credenciales inválidas"}, status_code=401)


def _duracion(segundos: int) -> str:
    minutos = max(1, -(-segundos // 60))
    horas, minutos = divmod(minutos, 60)
    partes = [f"{horas} h"] if horas else []
    if minutos:
        partes.append(f"{minutos} min")
    return " ".join(partes)


def respuesta_bloqueada(segundos: int) -> JSONResponse:
    return JSONResponse(
        {
            "detail": "IP bloqueada",
            "reintentar_en_s": segundos,
            "texto": f"Demasiados intentos. Probá de nuevo en {_duracion(segundos)}.",
        },
        status_code=403,
        headers={"Retry-After": str(segundos)},
    )


def respuesta_si_bloqueada(ip: str) -> JSONResponse | None:
    restante = ip_bloqueada(ip)
    return respuesta_bloqueada(restante) if restante else None
