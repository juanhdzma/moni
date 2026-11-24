from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from ..calculos.errores import ErrorDeDominio
from ..core.mensajes import mensaje_en_espanol

async def errores_de_dominio(request: Request, exc: ErrorDeDominio):
    return JSONResponse({"detail": exc.mensaje}, status_code=exc.status)


async def errores_de_validacion(request: Request, exc: RequestValidationError):
    detalle = [
        {"loc": e["loc"], "msg": mensaje_en_espanol(e), "type": e["type"]} for e in exc.errors()
    ]
    return JSONResponse({"detail": jsonable_encoder(detalle)}, status_code=422)
