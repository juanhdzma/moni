import logging
import sqlite3
from typing import Annotated

from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse, Response

from .. import sesiones
from .. import tiempo
from ..bloqueo import fallo_generico, lock_ip, respuesta_si_bloqueada
from ...core.db import conexion
from ..ip import client_ip
from ...schemas.respuestas.comun import Ok
from ...schemas.respuestas.seguridad import OpcionesLoginPasskey, OpcionesRegistroPasskey, PasskeyCreado, PasskeyFila
from ..step_up import ConClave, exigir_clave
from . import servicio
from .challenges import consumir_challenge

logger = logging.getLogger("moni.auth")

router = APIRouter(prefix="/api/auth")

Credencial = Annotated[dict, Body()]


def _json(texto: str) -> Response:
    return Response(content=texto, media_type="application/json")


@router.post("/passkey/login/opciones", response_model=OpcionesLoginPasskey)
def login_opciones(request: Request):
    texto = servicio.opciones_login(client_ip(request))
    if texto is None:
        return JSONResponse({"detail": "Sin passkeys"}, status_code=404)
    return _json(texto)


@router.post("/passkey/login/verificar", response_model=Ok)
async def login_verificar(request: Request, credencial: Credencial):
    ip = client_ip(request)
    async with lock_ip(ip):
        bloqueada = respuesta_si_bloqueada(ip)
        if bloqueada:
            return bloqueada
        challenge = consumir_challenge(credencial, "login", ip)
        if challenge is None:
            return await fallo_generico(request, "passkey")
        try:
            ok = await run_in_threadpool(servicio.verificar_login, credencial, challenge)
        except Exception:
            ok = False
        if not ok:
            return await fallo_generico(request, "passkey")
        response = JSONResponse({"ok": True})
        sesiones.crear_sesion(request, response, "passkey")
        return response


@router.post("/passkey/registro/opciones", response_model=OpcionesRegistroPasskey)
async def registro_opciones(request: Request, body: ConClave | None = None):
    sesiones.sesion_obligatoria(request)
    rechazo = await exigir_clave(request, body.clave if body else None)
    if rechazo:
        return rechazo
    if servicio.contar() >= servicio.MAX_PASSKEYS:
        raise HTTPException(status_code=409, detail="Límite de passkeys alcanzado")
    return _json(servicio.opciones_registro(client_ip(request)))


@router.post("/passkey/registro/verificar", response_model=PasskeyCreado)
def registro_verificar(request: Request, credencial: Credencial):
    sesiones.sesion_obligatoria(request)
    nombre = credencial.pop("nombre", None)
    if not isinstance(nombre, str) or not 1 <= len(nombre.strip()) <= 40:
        raise HTTPException(
            status_code=422,
            detail=[{"loc": ["body", "nombre"], "msg": "Nombre inválido", "type": "value_error"}],
        )
    challenge = consumir_challenge(credencial, "registro", client_ip(request))
    if challenge is None:
        raise HTTPException(status_code=400, detail="Registro inválido")
    try:
        nuevo = servicio.registrar(credencial, challenge, nombre.strip())
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Passkey ya registrado") from None
    except Exception as e:
        logger.warning("registro de passkey rechazado ip=%s", client_ip(request))
        raise HTTPException(status_code=400, detail="Registro inválido") from e
    if nuevo is None:
        raise HTTPException(status_code=409, detail="Límite de passkeys alcanzado")
    logger.info("passkey registrado id=%d", nuevo)
    return {"ok": True, "id": nuevo}


@router.get("/passkeys", response_model=list[PasskeyFila])
def listar(request: Request):
    sesiones.sesion_obligatoria(request)
    with conexion() as conn:
        filas = conn.execute("SELECT id, nombre, creada, ultimo_uso FROM passkeys ORDER BY id").fetchall()
    return [
        {
            **dict(f),
            "creada_texto": tiempo.texto_bogota(f["creada"]),
            "ultimo_uso_texto": tiempo.texto_bogota(f["ultimo_uso"]),
        }
        for f in filas
    ]


@router.delete("/passkeys/{passkey_id}", response_model=Ok)
def borrar(passkey_id: int, request: Request):
    sesiones.sesion_obligatoria(request)
    with conexion() as conn:
        n = conn.execute("DELETE FROM passkeys WHERE id = ?", (passkey_id,)).rowcount
        conn.commit()
    if not n:
        raise HTTPException(status_code=404, detail="Passkey no encontrado")
    logger.info("passkey eliminado id=%d", passkey_id)
    return {"ok": True}
