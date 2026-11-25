from fastapi import Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import password
from .bloqueo import fallo_generico, lock_ip, respuesta_si_bloqueada
from .ip import client_ip


class ConClave(BaseModel):
    clave: str | None = Field(default=None, max_length=256)


async def exigir_clave(request: Request, clave: str | None) -> JSONResponse | None:
    ip = client_ip(request)
    async with lock_ip(ip):
        bloqueada = respuesta_si_bloqueada(ip)
        if bloqueada:
            return bloqueada
        if clave and await run_in_threadpool(password.verificar_clave, clave):
            return None
        return await fallo_generico(request, "step_up", 403, "Ingresá tu clave para confirmar esta acción")
