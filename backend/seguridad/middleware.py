import hmac
import os

from fastapi import Request
from fastapi.responses import JSONResponse

from .bloqueo import fallo_generico, lock_ip, respuesta_si_bloqueada
from .ip import client_ip, es_https
from .password import configurado
from .sesiones import requiere_sesion

PUBLICAS = {
    ("GET", "/api/auth/estado"),
    ("POST", "/api/auth/login"),
    ("POST", "/api/auth/passkey/login/opciones"),
    ("POST", "/api/auth/passkey/login/verificar"),
}
PUSH_ENVIAR = "/api/push/enviar"
CSP = (
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
    "script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)


def _push_token_valido(request: Request) -> bool | None:
    cabecera = request.headers.get("authorization", "")
    if not cabecera.lower().startswith("bearer "):
        return None
    esperado = os.environ.get("MONI_PUSH_TOKEN", "")
    if len(esperado) < 32:
        return False
    return hmac.compare_digest(cabecera[7:].strip().encode(), esperado.encode())


def _ruta_normalizada(path: str) -> str:
    partes = []
    for seg in path.split("/"):
        if seg in ("", "."):
            continue
        if seg == "..":
            if partes:
                partes.pop()
            continue
        partes.append(seg)
    return "/" + "/".join(partes).lower()


def _no_autenticado() -> JSONResponse:
    return JSONResponse({"detail": "No autenticado"}, status_code=401)


async def middleware_auth(request: Request, call_next):
    raw = request.scope["path"]
    ruta = _ruta_normalizada(raw)
    if not ruta.startswith("/api"):
        return await call_next(request)
    bloqueada = respuesta_si_bloqueada(client_ip(request))
    if bloqueada:
        return bloqueada
    if (request.method, raw) in PUBLICAS:
        return await call_next(request)
    if not configurado():
        return _no_autenticado()
    if requiere_sesion(request) is not None:
        return await call_next(request)
    if request.method == "POST" and ruta == PUSH_ENVIAR:
        ip = client_ip(request)
        async with lock_ip(ip):
            bloqueada = respuesta_si_bloqueada(ip)
            if bloqueada:
                return bloqueada
            valido = _push_token_valido(request)
            if valido is False:
                return await fallo_generico(request, "push_token")
        if valido:
            request.state.push_token = True
            return await call_next(request)
    return _no_autenticado()


async def middleware_headers(request: Request, call_next):
    response = await call_next(request)
    h = response.headers
    h["Content-Security-Policy"] = CSP
    h["X-Frame-Options"] = "DENY"
    h["X-Content-Type-Options"] = "nosniff"
    h["Referrer-Policy"] = "no-referrer"
    h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    if es_https(request):
        h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if _ruta_normalizada(request.scope["path"]).startswith("/api"):
        h["Cache-Control"] = "no-store"
    return response
