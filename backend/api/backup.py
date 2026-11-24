from fastapi import APIRouter

from ..core.backup import IMPORT_TABLES, insertar_import, validar_import
from ..core.db import conexion
from ..schemas.backup import ImportPayload

router = APIRouter()


@router.get("/api/backup")
def exportar():
    with conexion() as conn:
        filas = {
            table: [dict(r) for r in conn.execute(f"SELECT * FROM {table} ORDER BY rowid")]
            for table, *_ in IMPORT_TABLES
        }
        filas["ajustes"] = [dict(r) for r in conn.execute("SELECT clave, valor FROM ajustes ORDER BY clave")]
        return filas


@router.post("/api/import")
def import_data(body: ImportPayload):
    validadas = validar_import(body.model_dump())
    with conexion() as conn:
        return insertar_import(conn, validadas)


@router.post("/api/truncate")
def truncate_all():
    with conexion() as conn:
        for table, *_ in IMPORT_TABLES:
            conn.execute(f"DELETE FROM {table}")
            conn.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
        conn.commit()
        return {"ok": True}
