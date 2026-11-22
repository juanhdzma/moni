from fastapi import APIRouter

from . import envio_rutas
from .envio import enviar_a_todos
from .job_diario import avisar, loop_diario
from .suscripciones import rutas as suscripciones_rutas
from .vapid import public_key

router = APIRouter()
router.include_router(suscripciones_rutas.router)
router.include_router(envio_rutas.router)

__all__ = ["avisar", "enviar_a_todos", "loop_diario", "public_key", "router"]
