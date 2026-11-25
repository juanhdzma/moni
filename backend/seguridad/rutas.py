import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import password, sesiones, tiempo
from .bloqueo import fallo_generico, lock_ip, respuesta_si_bloqueada
from ..core.db import conexion
from .ip import client_ip
from ..schemas.respuestas.comun import Ok
from ..schemas.respuestas.seguridad import EstadoAuth, Sesion

logger = logging.getLogger("moni.auth")

router = APIRouter(prefix="/api/auth")


class LoginIn(BaseModel):
    clave: str = Field(min_length=1, max_length=256)


@router.get("/estado", response_model=EstadoAuth)
def estado(request: Request):
    with conexion() as conn:
        passkeys = conn.execute("SELECT COUNT(*) FROM passkeys").fetchone()[0]
    return {
        "configurado": password.configurado(),
        "autenticado": sesiones.requiere_sesion(request) is not None,
        "tiene_passkeys": passkeys > 0,
    }


@router.post("/login", response_model=Ok)
async def login(body: LoginIn, request: Request):
    if not password.configurado():
        return JSONResponse({"detail": "Autenticación sin configurar"}, status_code=503)
    ip = client_ip(request)
    async with lock_ip(ip):
        bloqueada = respuesta_si_bloqueada(ip)
        if bloqueada:
            return bloqueada
        if not await run_in_threadpool(password.verificar_clave, body.clave):
            return await fallo_generico(request, "clave")
        response = JSONResponse({"ok": True})
        sesiones.crear_sesion(request, response, "clave")
        return response


@router.post("/logout", response_model=Ok)
def logout(request: Request):
    sesion = sesiones.sesion_obligatoria(request)
    sesiones.borrar_sesion(sesion["id"])
    response = JSONResponse({"ok": True})
    sesiones.quitar_cookie(request, response)
    return response


@router.get("/sesiones", response_model=list[Sesion])
def listar_sesiones(request: Request):
    actual = sesiones.sesion_obligatoria(request)
    with conexion() as conn:
        filas = conn.execute(
            f"SELECT id, creada, ultimo_uso, ip, user_agent, metodo FROM sesiones WHERE {sesiones.VIGENTE_SQL} ORDER BY ultimo_uso DESC",
            sesiones.limites_vigencia(tiempo.ahora()),
        ).fetchall()
    return [
        {
            **dict(f),
            "creada_texto": tiempo.texto_bogota(f["creada"]),
            "ultimo_uso_texto": tiempo.texto_bogota(f["ultimo_uso"]),
            "actual": f["id"] == actual["id"],
        }
        for f in filas
    ]


@router.delete("/sesiones/{sesion_id}", response_model=Ok)
def revocar_sesion(sesion_id: int, request: Request):
    actual = sesiones.sesion_obligatoria(request)
    if sesion_id == actual["id"]:
        raise HTTPException(status_code=400, detail="Usa logout para cerrar la sesión actual")
    if not sesiones.borrar_sesion(sesion_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    logger.info("sesion revocada id=%d", sesion_id)
    return {"ok": True}
