import datetime
import hashlib
import logging
import secrets

from fastapi import HTTPException, Request

from . import tiempo
from ..core.db import conexion
from .ip import client_ip, es_https
from .password import configurado

logger = logging.getLogger("moni.auth")

COOKIE = "moni_session"
SESION_DIAS = 30
INACTIVIDAD_DIAS = 7
REFRESCO_USO_S = 60


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def requiere_sesion(request: Request):
    cached = getattr(request.state, "sesion", False)
    if cached is not False:
        return cached
    request.state.sesion = None
    token = request.cookies.get(COOKIE)
    if not token or len(token) > 128 or not configurado():
        return None
    t = tiempo.ahora()
    with conexion() as conn:
        fila = conn.execute("SELECT * FROM sesiones WHERE token_hash = ?", (hash_token(token),)).fetchone()
        if fila is None:
            return None
        inactiva_desde = t - datetime.timedelta(days=INACTIVIDAD_DIAS)
        if fila["expira"] <= tiempo.iso(t) or fila["ultimo_uso"] <= tiempo.iso(inactiva_desde):
            conn.execute("DELETE FROM sesiones WHERE id = ?", (fila["id"],))
            conn.commit()
            return None
        sesion = dict(fila)
        if fila["ultimo_uso"] <= tiempo.iso(t - datetime.timedelta(seconds=REFRESCO_USO_S)):
            conn.execute("UPDATE sesiones SET ultimo_uso = ? WHERE id = ?", (tiempo.iso(t), fila["id"]))
            conn.commit()
            sesion["ultimo_uso"] = tiempo.iso(t)
    request.state.sesion = sesion
    return sesion


def sesion_obligatoria(request: Request) -> dict:
    sesion = requiere_sesion(request)
    if sesion is None:
        raise HTTPException(status_code=401, detail="No autenticado")
    return sesion


def crear_sesion(request: Request, response, metodo: str) -> int:
    token = secrets.token_urlsafe(32)
    t = tiempo.ahora()
    expira = t + datetime.timedelta(days=SESION_DIAS)
    ip = client_ip(request)
    with conexion() as conn:
        conn.execute("DELETE FROM sesiones WHERE expira <= ?", (tiempo.iso(t),))
        cur = conn.execute(
            "INSERT INTO sesiones (token_hash, creada, expira, ultimo_uso, ip, user_agent, metodo) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (hash_token(token), tiempo.iso(t), tiempo.iso(expira), tiempo.iso(t), ip, request.headers.get("user-agent", "")[:200], metodo),
        )
        conn.commit()
        sesion_id = cur.lastrowid
    response.set_cookie(
        COOKIE,
        token,
        max_age=SESION_DIAS * 86400,
        path="/",
        httponly=True,
        samesite="strict",
        secure=es_https(request),
    )
    logger.info("login ok ip=%s metodo=%s", ip, metodo)
    return sesion_id


def quitar_cookie(request: Request, response) -> None:
    response.delete_cookie(COOKIE, path="/", httponly=True, samesite="strict", secure=es_https(request))


def borrar_sesion(sesion_id: int) -> int:
    with conexion() as conn:
        n = conn.execute("DELETE FROM sesiones WHERE id = ?", (sesion_id,)).rowcount
        conn.commit()
    return n
