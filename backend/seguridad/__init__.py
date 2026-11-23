from fastapi import APIRouter

from . import passkeys, rutas
from .ip import client_ip
from .middleware import middleware_auth, middleware_headers

router = APIRouter()
router.include_router(rutas.router)
router.include_router(passkeys.router)

__all__ = ["client_ip", "middleware_auth", "middleware_headers", "router"]
