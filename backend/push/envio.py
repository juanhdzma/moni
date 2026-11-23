import json
import logging
from typing import Optional

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


def enviar_a_todos(title: str, body: str, url: Optional[str] = None, tag: Optional[str] = None) -> dict:
    key = clave_privada()
    payload = json.dumps(armar_payload(title, body, url, tag))
    with db.conexion() as conn:
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
        conn.commit()
        return {"enviadas": enviadas, "eliminadas": eliminadas}
