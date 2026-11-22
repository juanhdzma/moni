import logging
import sqlite3
from typing import Annotated

from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from . import auth, db, passkeys

logger = logging.getLogger("moni.auth")

router = APIRouter(prefix="/api/auth")

Credencial = Annotated[dict, Body()]


class NombreIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=40)


def _sesion(request: Request):
    sesion = auth.requiere_sesion(request)
    if sesion is None:
        raise HTTPException(status_code=401, detail="No autenticado")
    return sesion


def _json(texto: str) -> Response:
    return Response(content=texto, media_type="application/json")


@router.post("/passkey/login/opciones")
def login_opciones(request: Request):
    texto = passkeys.opciones_login(auth.client_ip(request))
    if texto is None:
        return JSONResponse({"detail": "Sin passkeys"}, status_code=404)
    return _json(texto)


@router.post("/passkey/login/verificar")
async def login_verificar(request: Request, credencial: Credencial):
    ip = auth.client_ip(request)
    async with auth.lock_ip(ip):
        restante = auth.ip_bloqueada(ip)
        if restante:
            return auth.respuesta_bloqueada(restante)
        challenge = passkeys.consumir_challenge(credencial, "login", ip)
        if challenge is None:
            return await auth.fallo_generico(request, "passkey")
        try:
            ok = await run_in_threadpool(passkeys.verificar_login, credencial, challenge)
        except Exception:
            ok = False
        if not ok:
            return await auth.fallo_generico(request, "passkey")
        response = JSONResponse({"ok": True})
        auth.crear_sesion(request, response, "passkey")
        return response


@router.post("/passkey/registro/opciones")
def registro_opciones(body: NombreIn, request: Request):
    _sesion(request)
    if passkeys.contar() >= passkeys.MAX_PASSKEYS:
        raise HTTPException(status_code=409, detail="Limite de passkeys alcanzado")
    return _json(passkeys.opciones_registro(auth.client_ip(request)))


@router.post("/passkey/registro/verificar")
def registro_verificar(request: Request, credencial: Credencial):
    _sesion(request)
    nombre = credencial.pop("nombre", None)
    if not isinstance(nombre, str) or not 1 <= len(nombre.strip()) <= 40:
        raise HTTPException(status_code=422, detail="Nombre invalido")
    challenge = passkeys.consumir_challenge(credencial, "registro", auth.client_ip(request))
    if challenge is None:
        raise HTTPException(status_code=400, detail="Registro invalido")
    try:
        nuevo = passkeys.registrar(credencial, challenge, nombre.strip())
    except Exception as exc:
        if isinstance(exc, sqlite3.IntegrityError):
            raise HTTPException(status_code=409, detail="Passkey ya registrado")
        logger.warning("registro de passkey rechazado ip=%s", auth.client_ip(request))
        raise HTTPException(status_code=400, detail="Registro invalido")
    if nuevo is None:
        raise HTTPException(status_code=409, detail="Limite de passkeys alcanzado")
    logger.info("passkey registrado id=%d", nuevo)
    return {"ok": True, "id": nuevo}


@router.get("/passkeys")
def listar(request: Request):
    _sesion(request)
    conn = db.get_conn()
    try:
        filas = conn.execute("SELECT id, nombre, creada, ultimo_uso FROM passkeys ORDER BY id").fetchall()
    finally:
        conn.close()
    return [dict(f) for f in filas]


@router.delete("/passkeys/{passkey_id}")
def borrar(passkey_id: int, request: Request):
    _sesion(request)
    conn = db.get_conn()
    try:
        n = conn.execute("DELETE FROM passkeys WHERE id = ?", (passkey_id,)).rowcount
        conn.commit()
    finally:
        conn.close()
    if not n:
        raise HTTPException(status_code=404, detail="Passkey no encontrado")
    logger.info("passkey eliminado id=%d", passkey_id)
    return {"ok": True}
