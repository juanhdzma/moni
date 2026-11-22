import sqlite3

from fastapi import APIRouter, HTTPException

from ..core.db import conexion
from ..core.tablas import ACTIVO_COLS, DEUDA_COLS, INV_COLS, REC_COLS, TX_COLS
from ..schemas.activo import ActivoIn
from ..schemas.backup import ImportPayload
from ..schemas.deuda import DeudaIn
from ..schemas.inversion import InvIn
from ..schemas.recurrente import RecIn
from ..schemas.transaccion import TxIn

router = APIRouter()

IMPORT_TABLES = [
    ("deudas", ["id"] + DEUDA_COLS + ["total_intereses"], DeudaIn),
    ("inversiones", ["id"] + INV_COLS, InvIn),
    ("activos", ["id"] + ACTIVO_COLS, ActivoIn),
    ("recurrentes", ["id"] + REC_COLS, RecIn),
    ("transacciones", ["id"] + TX_COLS, TxIn),
]


def _validar_fila_import(table, model, row, idx):
    if not isinstance(row, dict):
        raise HTTPException(400, f"{table}[{idx}]: se esperaba un objeto")
    try:
        limpia = model.model_validate(row).model_dump()
    except Exception as e:
        raise HTTPException(400, f"{table}[{idx}] inválido: {e}")
    for extra in ("id", "total_intereses"):
        if extra in row and row[extra] is not None:
            if not isinstance(row[extra], (int, float)) or isinstance(row[extra], bool):
                raise HTTPException(400, f"{table}[{idx}].{extra} debe ser numérico")
            limpia[extra] = row[extra]
    return limpia


@router.post("/api/import")
def import_data(body: ImportPayload):
    payload = body.model_dump()
    validadas = {
        table: [_validar_fila_import(table, model, r, i) for i, r in enumerate(payload.get(table) or [])]
        for table, _cols, model in IMPORT_TABLES
    }
    with conexion() as conn:
        counts = {}
        try:
            for table, cols, _model in IMPORT_TABLES:
                rows = validadas[table]
                col_list = ", ".join(cols)
                placeholders = ", ".join("?" * len(cols))
                for row in rows:
                    conn.execute(
                        f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})",
                        [row.get(c) for c in cols],
                    )
                counts[table] = len(rows)
            conn.commit()
            return counts
        except sqlite3.IntegrityError as e:
            conn.rollback()
            raise HTTPException(400, f"Import falló (¿ids duplicados? borrá los datos existentes primero): {e}")


@router.post("/api/truncate")
def truncate_all():
    with conexion() as conn:
        for table, _cols, _model in IMPORT_TABLES:
            conn.execute(f"DELETE FROM {table}")
            conn.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
        conn.execute("DELETE FROM categorias")
        conn.execute("DELETE FROM ops_ocultas")
        conn.commit()
        return {"ok": True}
