import collections
import logging
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from ..seguridad import client_ip
from . import envio

logger = logging.getLogger("moni")

router = APIRouter()

MAX_PAYLOAD_BYTES = 1500
MAX_ENVIOS = 20
VENTANA_S = 60
_envios: dict[str, collections.deque] = collections.defaultdict(collections.deque)


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
    ahora = time.monotonic()
    for ip in [ip for ip, c in _envios.items() if not c or ahora - c[-1] > VENTANA_S]:
        del _envios[ip]
    cola = _envios[client_ip(request)]
    while cola and ahora - cola[0] > VENTANA_S:
        cola.popleft()
    if len(cola) >= MAX_ENVIOS:
        raise HTTPException(429, "Demasiados envios", headers={"Retry-After": str(VENTANA_S)})
    cola.append(ahora)


@router.post("/api/push/enviar")
def push_enviar(body: PushEnviar, request: Request):
    _limitar(request)
    payload = envio.armar_payload(body.title, body.body, body.url, body.tag)
    if envio.tamano_payload(payload) > MAX_PAYLOAD_BYTES:
        raise HTTPException(413, "Payload demasiado grande")
    resultado = envio.enviar_a_todos(body.title, body.body, body.url, body.tag)
    logger.info(
        "push enviado ip=%s via=%s enviadas=%d eliminadas=%d",
        client_ip(request),
        "token" if getattr(request.state, "push_token", False) else "sesion",
        resultado["enviadas"],
        resultado["eliminadas"],
    )
    return resultado
