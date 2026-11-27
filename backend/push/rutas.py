import logging
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from ..schemas.respuestas.seguridad import PushEnviado, PushProbado
from ..seguridad import client_ip
from ..seguridad.limite import limitar, nuevo_registro
from . import envio

logger = logging.getLogger("moni")

router = APIRouter()

MAX_PAYLOAD_BYTES = 1500
MAX_ENVIOS = 20
VENTANA_S = 60
_lock_envios, _envios = nuevo_registro()


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
    limitar(_lock_envios, _envios, client_ip(request), MAX_ENVIOS, VENTANA_S, "Demasiados envíos")


@router.post("/api/push/enviar", response_model=PushEnviado)
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


@router.post("/api/push/test", response_model=PushProbado)
def push_test(request: Request):
    _limitar(request)
    return {"enviadas": envio.enviar_a_todos("Moni", "Las notificaciones funcionan.", tag="test")["enviadas"]}
