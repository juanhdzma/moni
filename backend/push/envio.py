import json
import logging
from typing import Optional

import requests
from pywebpush import WebPushException, webpush

from ..core import db
from .vapid import VAPID_SUBJECT, clave_privada

logger = logging.getLogger("moni")


def armar_payload(title: str, body: str, url: Optional[str] = None, tag: Optional[str] = None) -> dict:
    payload = {"title": title, "body": body}
    if url:
        payload["url"] = url
    if tag:
        payload["tag"] = tag
    return payload


def tamano_payload(payload: dict) -> int:
    return len(json.dumps(payload).encode())


def _sesion_sin_redirects() -> requests.Session:
    sesion = requests.Session()
    sesion.max_redirects = 0
    return sesion


def enviar_a_todos(title: str, body: str, url: Optional[str] = None, tag: Optional[str] = None) -> dict:
    key = clave_privada()
    payload = json.dumps(armar_payload(title, body, url, tag))
    with db.conexion() as conn:
        subs = conn.execute("SELECT * FROM push_subs").fetchall()
    sesion = _sesion_sin_redirects()
    enviadas = 0
    caducadas = []
    for s in subs:
        info = {"endpoint": s["endpoint"], "keys": {"p256dh": s["p256dh"], "auth": s["auth"]}}
        try:
            webpush(
                info, payload, vapid_private_key=key, vapid_claims={"sub": VAPID_SUBJECT},
                ttl=86400, timeout=15, requests_session=sesion,
            )
            enviadas += 1
        except WebPushException as e:
            if e.response is not None and e.response.status_code in (404, 410):
                caducadas.append(s["id"])
            else:
                logger.warning("push falló para sub %s: %s", s["id"], e)
        except Exception as e:
            logger.warning("push falló para sub %s: %s", s["id"], e)
    if caducadas:
        with db.conexion() as conn:
            conn.executemany("DELETE FROM push_subs WHERE id = ?", [(i,) for i in caducadas])
            conn.commit()
    return {"enviadas": enviadas, "eliminadas": len(caducadas)}
