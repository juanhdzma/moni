import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles

from . import push, seguridad
from .api import router as api_router
from .api import meta
from .api.errores import errores_de_dominio, errores_de_validacion
from .calculos.base.fechas import hoy_bogota
from .calculos.base.errores import ErrorDeDominio
from .core import db
from .core.afectadas import afectadas_por_defecto
from .core.csrf import require_csrf_header
from .core.ops_ocultas import podar_ocultas
from .seguridad.limite_body import LimiteBody

logging.basicConfig(
    level=logging.INFO,
    stream=sys.stdout,
    format='ts=%(asctime)s level=%(levelname)s logger=%(name)s msg="%(message)s"',
)
logger = logging.getLogger("moni")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "web" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    push.public_key()
    with db.conexion() as conn:
        podar_ocultas(conn, hoy_bogota())
        conn.commit()
    tarea = asyncio.create_task(push.loop_diario())
    yield
    tarea.cancel()


app = FastAPI(title="Moni API", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

app.middleware("http")(afectadas_por_defecto)
app.middleware("http")(require_csrf_header)
app.middleware("http")(seguridad.middleware_auth)
app.middleware("http")(seguridad.middleware_headers)
app.add_middleware(LimiteBody)
app.include_router(seguridad.router)
app.include_router(push.router)
app.include_router(api_router)
app.include_router(meta.router)
app.add_exception_handler(RequestValidationError, errores_de_validacion)
app.add_exception_handler(ErrorDeDominio, errores_de_dominio)

if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
else:
    logger.error("%s no existe: el frontend responde 404. Corré `npm run build` en web/.", FRONTEND_DIR)
