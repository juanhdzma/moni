import collections
import logging
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from . import auth, db, push

logger = logging.getLogger("moni")

router = APIRouter()

MAX_PAYLOAD_BYTES = 1500
MAX_ENVIOS = 20
VENTANA_S = 60
_envios: dict[str, collections.deque] = collections.defaultdict(collections.deque)


class PushKeys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=200)
    auth: str = Field(min_length=1, max_length=100)


class PushSub(BaseModel):
    endpoint: str = Field(max_length=1000)
    keys: PushKeys

    @field_validator("endpoint")
    @classmethod
    def _endpoint(cls, v: str) -> str:
        if not push.endpoint_permitido(v):
            raise ValueError("endpoint de push no permitido")
        return v


class PushUnsub(BaseModel):
    endpoint: str = Field(max_length=1000)


class PushEnviar(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    body: str = Field(default="", max_length=300)
    url: Optional[str] = Field(default=None, max_length=200)
    tag: Optional[str] = Field(default=None, max_length=40)

    @field_validator("url")
    @classmethod
    def _url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not v.startswith("/") or v.startswith("//") or "\\" in v or any(ord(c) < 32 for c in v):
            raise ValueError("url debe ser una ruta relativa que empiece con /")
        return v


def _limitar(request: Request) -> None:
    ip = auth.client_ip(request)
    ahora = time.monotonic()
    cola = _envios[ip]
    while cola and ahora - cola[0] > VENTANA_S:
        cola.popleft()
    if len(cola) >= MAX_ENVIOS:
        raise HTTPException(429, "Demasiados envios", headers={"Retry-After": str(VENTANA_S)})
    cola.append(ahora)


@router.get("/api/push/key")
def push_key():
    return {"key": push.public_key()}


@router.post("/api/push/subscribe")
def push_subscribe(body: PushSub):
    conn = db.get_conn()
    try:
        conn.execute(
            "INSERT INTO push_subs (endpoint, p256dh, auth) VALUES (?, ?, ?) "
            "ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth",
            (body.endpoint, body.keys.p256dh, body.keys.auth),
        )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@router.post("/api/push/unsubscribe")
def push_unsubscribe(body: PushUnsub):
    conn = db.get_conn()
    try:
        conn.execute("DELETE FROM push_subs WHERE endpoint = ?", (body.endpoint,))
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@router.post("/api/push/test")
def push_test():
    return {"enviadas": push.enviar_a_todos("Moni", "Las notificaciones funcionan.", tag="test")["enviadas"]}


@router.post("/api/push/enviar")
def push_enviar(body: PushEnviar, request: Request):
    _limitar(request)
    payload = push.armar_payload(body.title, body.body, body.url, body.tag)
    if push.tamano_payload(payload) > MAX_PAYLOAD_BYTES:
        raise HTTPException(413, "Payload demasiado grande")
    resultado = push.enviar_a_todos(body.title, body.body, body.url, body.tag)
    logger.info(
        "push enviado ip=%s via=%s enviadas=%d eliminadas=%d",
        auth.client_ip(request),
        "token" if getattr(request.state, "push_token", False) else "sesion",
        resultado["enviadas"],
        resultado["eliminadas"],
    )
    return resultado
