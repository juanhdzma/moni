import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import auth, db

logger = logging.getLogger("moni.auth")

router = APIRouter(prefix="/api/auth")


class LoginIn(BaseModel):
    clave: str = Field(min_length=1, max_length=256)


@router.get("/estado")
def estado(request: Request):
    conn = db.get_conn()
    try:
        passkeys = conn.execute("SELECT COUNT(*) FROM passkeys").fetchone()[0]
    finally:
        conn.close()
    return {
        "configurado": auth.configurado(),
        "autenticado": auth.requiere_sesion(request) is not None,
        "passkeys": passkeys,
        "bloqueada": False,
    }


@router.post("/login")
async def login(body: LoginIn, request: Request):
    if not auth.configurado():
        return JSONResponse({"detail": "Autenticacion sin configurar"}, status_code=503)
    ip = auth.client_ip(request)
    async with auth.lock_ip(ip):
        restante = auth.ip_bloqueada(ip)
        if restante:
            return auth.respuesta_bloqueada(restante)
        if not await run_in_threadpool(auth.verificar_clave, body.clave):
            return await auth.fallo_generico(request, "clave")
        response = JSONResponse({"ok": True})
        auth.crear_sesion(request, response, "clave")
        return response


@router.post("/logout")
def logout(request: Request):
    sesion = auth.requiere_sesion(request)
    if sesion is None:
        raise HTTPException(status_code=401, detail="No autenticado")
    auth.borrar_sesion(sesion["id"])
    response = JSONResponse({"ok": True})
    response.delete_cookie(auth.COOKIE, path="/", httponly=True, samesite="strict", secure=auth.es_https(request))
    return response


@router.get("/sesiones")
def listar_sesiones(request: Request):
    actual = auth.requiere_sesion(request)
    if actual is None:
        raise HTTPException(status_code=401, detail="No autenticado")
    conn = db.get_conn()
    try:
        filas = conn.execute(
            "SELECT id, creada, ultimo_uso, ip, user_agent, metodo FROM sesiones WHERE expira > ? ORDER BY ultimo_uso DESC",
            (auth.iso(auth.ahora()),),
        ).fetchall()
    finally:
        conn.close()
    return [{**dict(f), "actual": f["id"] == actual["id"]} for f in filas]


@router.delete("/sesiones/{sesion_id}")
def revocar_sesion(sesion_id: int, request: Request):
    actual = auth.requiere_sesion(request)
    if actual is None:
        raise HTTPException(status_code=401, detail="No autenticado")
    if sesion_id == actual["id"]:
        raise HTTPException(status_code=400, detail="Usa logout para cerrar la sesion actual")
    conn = db.get_conn()
    try:
        n = conn.execute("DELETE FROM sesiones WHERE id = ?", (sesion_id,)).rowcount
        conn.commit()
    finally:
        conn.close()
    if not n:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")
    logger.info("sesion revocada id=%d", sesion_id)
    return {"ok": True}
