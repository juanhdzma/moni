import asyncio
import base64
import datetime
import json
import logging
import os
import threading
from typing import Optional
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid02
from urllib3.util import parse_url
from pywebpush import WebPushException, webpush

from . import db
from .calculos.operaciones import operaciones_proximas

logger = logging.getLogger("moni")

TZ = ZoneInfo("America/Bogota")
_vapid_lock = threading.Lock()
HORA_AVISO = 8
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "https://moni.nufi.com.co")

# Un endpoint arbitrario haría que el server le hiciera POST a cualquier URL (SSRF):
# solo se aceptan los servicios de push de los navegadores.
PUSH_HOSTS = ("fcm.googleapis.com", "push.apple.com", "push.services.mozilla.com", "notify.windows.com")

def endpoint_permitido(endpoint: str) -> bool:
    if "\\" in endpoint:
        return False
    try:
        u = urlsplit(endpoint)
        host_urllib3 = parse_url(endpoint).host or ""
        if u.username or u.password or u.port not in (None, 443):
            return False
    except ValueError:
        return False
    host = u.hostname or ""
    if host != host_urllib3.lower():
        return False
    return u.scheme == "https" and any(host == h or host.endswith("." + h) for h in PUSH_HOSTS)


def _vapid() -> Vapid02:
    path = db.DB_PATH.parent / "vapid_private.pem"
    with _vapid_lock:
        if path.exists():
            return Vapid02.from_file(str(path))
        v = Vapid02()
        v.generate_keys()
        v.save_key(str(path))
        path.chmod(0o600)
        return v


def public_key() -> str:
    raw = _vapid().public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


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


def armar_payload(title: str, body: str, url: Optional[str] = None, tag: Optional[str] = None) -> dict:
    payload = {"title": title, "body": body}
    if url:
        payload["url"] = url
    if tag:
        payload["tag"] = tag
    return payload


def tamano_payload(payload: dict) -> int:
    return len(json.dumps(payload).encode())


def enviar_a_todos(title: str, body: str, url: Optional[str] = None, tag: Optional[str] = None) -> dict:
    key = _vapid()
    payload = json.dumps(armar_payload(title, body, url, tag))
    conn = db.get_conn()
    try:
        enviadas = 0
        eliminadas = 0
        for s in conn.execute("SELECT * FROM push_subs").fetchall():
            info = {"endpoint": s["endpoint"], "keys": {"p256dh": s["p256dh"], "auth": s["auth"]}}
            try:
                webpush(info, payload, vapid_private_key=key, vapid_claims={"sub": VAPID_SUBJECT}, ttl=86400, timeout=15)
                enviadas += 1
            except WebPushException as e:
                if e.response is not None and e.response.status_code in (404, 410):
                    conn.execute("DELETE FROM push_subs WHERE id = ?", (s["id"],))
                    eliminadas += 1
                else:
                    logger.warning("push falló para sub %s: %s", s["id"], e)
            except Exception as e:
                logger.warning("push falló para sub %s: %s", s["id"], e)
        return {"enviadas": enviadas, "eliminadas": eliminadas}
    finally:
        conn.commit()
        conn.close()


def enviar(mensaje: dict) -> int:
    return enviar_a_todos(mensaje["title"], mensaje["body"], mensaje.get("url"), mensaje.get("tag"))["enviadas"]


def avisar(hoy: Optional[datetime.date] = None) -> int:
    hoy = hoy or datetime.datetime.now(TZ).date()
    conn = db.get_conn()
    try:
        ops = operaciones_del_dia(conn, hoy)
    finally:
        conn.close()
    if not ops:
        return 0
    enviadas = enviar(armar_mensaje(ops, hoy))
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
