from fastapi import APIRouter, Request, Response
from fastapi.concurrency import run_in_threadpool

from ..core.afectadas import TODAS, afectar
from ..core.backup import IMPORT_TABLES, insertar_import, validar_import
from ..core.db import conexion
from ..schemas.backup import ImportPayload
from ..seguridad.step_up import ConClave, exigir_clave

router = APIRouter()


class ImportConClave(ImportPayload, ConClave):
    pass


@router.get("/api/backup")
def exportar():
    with conexion() as conn:
        filas = {
            table: [dict(r) for r in conn.execute(f"SELECT * FROM {table} ORDER BY rowid")]
            for table, *_ in IMPORT_TABLES
        }
        filas["ajustes"] = [dict(r) for r in conn.execute("SELECT clave, valor FROM ajustes ORDER BY clave")]
        return filas


def _importar(datos: dict) -> dict:
    validadas = validar_import(datos)
    with conexion() as conn:
        return insertar_import(conn, validadas)


def _vaciar() -> None:
    with conexion() as conn:
        for table, *_ in IMPORT_TABLES:
            conn.execute(f"DELETE FROM {table}")
            conn.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
        conn.commit()


@router.post("/api/import")
async def import_data(body: ImportConClave, request: Request, response: Response):
    rechazo = await exigir_clave(request, body.clave)
    if rechazo:
        return rechazo
    resultado = await run_in_threadpool(_importar, body.model_dump(exclude={"clave"}))
    afectar(response, *TODAS)
    return resultado


@router.post("/api/truncate")
async def truncate_all(request: Request, response: Response, body: ConClave | None = None):
    rechazo = await exigir_clave(request, body.clave if body else None)
    if rechazo:
        return rechazo
    await run_in_threadpool(_vaciar)
    afectar(response, *TODAS)
    return {"ok": True}
