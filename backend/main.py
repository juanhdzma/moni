import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from . import push, seguridad
from .api import router as api_router
from .calculos.fechas import hoy_bogota
from .core import db
from .core.csrf import require_csrf_header
from .core.ops_ocultas import podar_ocultas

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

app.middleware("http")(require_csrf_header)
app.middleware("http")(seguridad.middleware_auth)
app.middleware("http")(seguridad.middleware_headers)
app.include_router(seguridad.router)
app.include_router(push.router)
app.include_router(api_router)

if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
else:
    logger.error("%s no existe: el frontend responde 404. Corré `npm run build` en web/.", FRONTEND_DIR)
