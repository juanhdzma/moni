from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from ...core import db
from ...schemas.respuestas.comun import Ok
from ...schemas.respuestas.seguridad import ClavePush
from .. import vapid
from .endpoint import endpoint_permitido

router = APIRouter()


class PushKeys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=200)
    auth: str = Field(min_length=1, max_length=100)


class PushSub(BaseModel):
    endpoint: str = Field(max_length=1000)
    keys: PushKeys

    @field_validator("endpoint")
    @classmethod
    def _endpoint(cls, v: str) -> str:
        if not endpoint_permitido(v):
            raise ValueError("endpoint de push no permitido")
        return v


class PushUnsub(BaseModel):
    endpoint: str = Field(max_length=1000)


def _ejecutar(sql: str, params: tuple) -> dict:
    with db.conexion() as conn:
        conn.execute(sql, params)
        conn.commit()
    return {"ok": True}


@router.get("/api/push/key", response_model=ClavePush)
def push_key():
    return {"key": vapid.public_key()}


@router.post("/api/push/subscribe", response_model=Ok)
def push_subscribe(body: PushSub):
    return _ejecutar(
        "INSERT INTO push_subs (endpoint, p256dh, auth) VALUES (?, ?, ?) "
        "ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth",
        (body.endpoint, body.keys.p256dh, body.keys.auth),
    )


@router.post("/api/push/unsubscribe", response_model=Ok)
def push_unsubscribe(body: PushUnsub):
    return _ejecutar("DELETE FROM push_subs WHERE endpoint = ?", (body.endpoint,))
