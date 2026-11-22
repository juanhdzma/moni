from fastapi import APIRouter

from . import bloqueo, ip, middleware, passkeys, password, rutas, sesiones, tiempo
from .bloqueo import (
    RETRASO_FALLO,
    fallo_generico,
    ip_bloqueada,
    lock_ip,
    registrar_fallo,
    respuesta_bloqueada,
    respuesta_si_bloqueada,
)
from .ip import client_ip, es_https, normalizar_ip
from .middleware import PUBLICAS, middleware_auth, middleware_headers
from .password import configurado, hash_clave, verificar_clave
from .sesiones import COOKIE, borrar_sesion, crear_sesion, requiere_sesion, sesion_obligatoria
from .tiempo import ahora, iso

router = APIRouter()
router.include_router(rutas.router)
router.include_router(passkeys.router)

__all__ = [
    "bloqueo", "middleware", "passkeys", "password", "rutas", "sesiones", "tiempo",
    "COOKIE", "PUBLICAS", "RETRASO_FALLO", "ahora", "borrar_sesion", "client_ip", "configurado", "crear_sesion",
    "es_https", "fallo_generico", "hash_clave", "ip", "ip_bloqueada", "iso", "lock_ip", "middleware_auth",
    "middleware_headers", "normalizar_ip", "registrar_fallo", "requiere_sesion", "respuesta_bloqueada",
    "respuesta_si_bloqueada", "router", "sesion_obligatoria", "verificar_clave",
]
