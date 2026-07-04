from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import db

FRONTEND_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(title="Moni API")


@app.on_event("startup")
def on_startup():
    db.init_db()


# ── Models ────────────────────────────────────────────────────────────────────
class TxIn(BaseModel):
    fecha: str
    tipo: str
    categoria: str
    descripcion: str = ""
    monto: float
    notas: str = ""


class DeudaIn(BaseModel):
    nombre: str
    monto_inicial: float
    saldo_actual: float
    tasa_ea: float = 0
    cuota_mensual: float = 0
    fecha_inicio: str = ""
    proxima_cuota: str = ""
    crear_tx: bool = False


class DeudaPago(BaseModel):
    nuevo_saldo: float
    total_pagado: float
    fecha: str
    descripcion: str
    notas: str = ""
    registrar_tx: bool = True


class InvIn(BaseModel):
    nombre: str
    tipo: str
    monto_invertido: float
    valor_actual: float
    tasa_ea: Optional[float] = None
    fecha_inicio: str = ""
    pago: Optional[str] = None
    dia_pago: Optional[int] = None
    crear_tx: bool = False


class InvRendimiento(BaseModel):
    monto: float
    fecha: str
    notas: str = ""
    registrar_tx: bool = True


class InvAporte(BaseModel):
    monto: float
    nuevo_valor: float
    fecha: str
    notas: str = ""
    registrar_tx: bool = True


class InvRetiro(BaseModel):
    tipo: str  # 'total' | 'parcial'
    monto: float
    saldo_queda: Optional[float] = None
    fecha: str
    notas: str = ""
    registrar_tx: bool = True


class ActivoIn(BaseModel):
    nombre: str
    valor_inicial: float
    valor_actual: float
    fecha_adquisicion: str = ""
    crear_tx: bool = False


class ActivoVenta(BaseModel):
    precio: float
    fecha: str
    notas: str = ""
    registrar_tx: bool = True


class RecIn(BaseModel):
    nombre: str
    tipo: str
    monto: float
    frecuencia: str
    activo: bool = True
    fecha_inicio: str = ""
    notas: str = ""


TX_COLS = ["fecha", "tipo", "categoria", "descripcion", "monto", "notas"]
DEUDA_COLS = ["nombre", "monto_inicial", "saldo_actual", "tasa_ea", "cuota_mensual", "fecha_inicio", "proxima_cuota"]
INV_COLS = ["nombre", "tipo", "monto_invertido", "valor_actual", "tasa_ea", "fecha_inicio", "pago", "dia_pago"]
ACTIVO_COLS = ["nombre", "valor_inicial", "valor_actual", "fecha_adquisicion"]
REC_COLS = ["nombre", "tipo", "monto", "frecuencia", "activo", "fecha_inicio", "notas"]

TABLES = {
    "tx": ("transacciones", TX_COLS),
    "deuda": ("deudas", DEUDA_COLS),
    "inv": ("inversiones", INV_COLS),
    "activo": ("activos", ACTIVO_COLS),
    "rec": ("recurrentes", REC_COLS),
}


# ── SQL helpers ───────────────────────────────────────────────────────────────
def insert_row(conn, table, cols, values):
    col_list = ", ".join(cols)
    placeholders = ", ".join("?" * len(cols))
    cur = conn.execute(
        f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})",
        [values.get(c) for c in cols],
    )
    return cur.lastrowid


def update_row(conn, table, cols, row_id, values):
    set_clause = ", ".join(f"{c} = ?" for c in cols)
    cur = conn.execute(
        f"UPDATE {table} SET {set_clause} WHERE id = ?",
        [values.get(c) for c in cols] + [row_id],
    )
    if cur.rowcount == 0:
        raise HTTPException(404, f"{table} {row_id} no encontrado")


def get_row(conn, table, row_id):
    row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (row_id,)).fetchone()
    if row is None:
        raise HTTPException(404, f"{table} {row_id} no encontrado")
    return dict(row)


def delete_row(conn, table, row_id):
    cur = conn.execute(f"DELETE FROM {table} WHERE id = ?", (row_id,))
    if cur.rowcount == 0:
        raise HTTPException(404, f"{table} {row_id} no encontrado")


# ── GET /api/all ──────────────────────────────────────────────────────────────
@app.get("/api/all")
def get_all():
    conn = db.get_conn()
    try:
        return {
            "transacciones": [dict(r) for r in conn.execute("SELECT * FROM transacciones ORDER BY id")],
            "deudas": [dict(r) for r in conn.execute("SELECT * FROM deudas ORDER BY id")],
            "inversiones": [dict(r) for r in conn.execute("SELECT * FROM inversiones ORDER BY id")],
            "activos": [dict(r) for r in conn.execute("SELECT * FROM activos ORDER BY id")],
            "recurrentes": [dict(r) for r in conn.execute("SELECT * FROM recurrentes ORDER BY id")],
        }
    finally:
        conn.close()


# ── Generic CRUD factory ─────────────────────────────────────────────────────
def register_crud(path, model, linked_tx=None):
    table, cols = TABLES[path]

    @app.post(f"/api/{path}", name=f"create_{path}")
    def create(body: model):
        conn = db.get_conn()
        try:
            data = body.model_dump()
            crear_tx = data.pop("crear_tx", False)
            new_id = insert_row(conn, table, cols, data)
            if crear_tx and linked_tx:
                insert_row(conn, "transacciones", TX_COLS, {
                    "fecha": data.get(linked_tx["fecha_field"]) or "",
                    "tipo": linked_tx["tipo"],
                    "categoria": linked_tx["categoria"],
                    "descripcion": linked_tx["desc_fn"](data),
                    "monto": linked_tx["monto_fn"](data),
                    "notas": "",
                })
            conn.commit()
            return get_row(conn, table, new_id)
        finally:
            conn.close()

    @app.put(f"/api/{path}/{{row_id}}", name=f"update_{path}")
    def update(row_id: int, body: model):
        conn = db.get_conn()
        try:
            data = body.model_dump()
            data.pop("crear_tx", None)
            update_row(conn, table, cols, row_id, data)
            conn.commit()
            return get_row(conn, table, row_id)
        finally:
            conn.close()

    @app.delete(f"/api/{path}/{{row_id}}", status_code=204, name=f"delete_{path}")
    def delete(row_id: int):
        conn = db.get_conn()
        try:
            delete_row(conn, table, row_id)
            conn.commit()
        finally:
            conn.close()


register_crud("tx", TxIn)
register_crud("deuda", DeudaIn, linked_tx={
    "tipo": "ingreso", "categoria": "Crédito recibido", "fecha_field": "fecha_inicio",
    "desc_fn": lambda d: f"Crédito · {d['nombre']}",
    "monto_fn": lambda d: d.get("monto_inicial") or d["saldo_actual"],
})
register_crud("inv", InvIn, linked_tx={
    "tipo": "gasto", "categoria": "Inversión", "fecha_field": "fecha_inicio",
    "desc_fn": lambda d: f"Nueva inversión · {d['nombre']}",
    "monto_fn": lambda d: d["monto_invertido"],
})
register_crud("activo", ActivoIn, linked_tx={
    "tipo": "gasto", "categoria": "Compra activos", "fecha_field": "fecha_adquisicion",
    "desc_fn": lambda d: f"Compra · {d['nombre']}",
    "monto_fn": lambda d: d["valor_inicial"],
})
register_crud("rec", RecIn)


# ── Composite actions (multi-table writes, one SQLite transaction each) ──────
@app.post("/api/deuda/{deuda_id}/pago")
def pagar_deuda(deuda_id: int, body: DeudaPago):
    conn = db.get_conn()
    try:
        get_row(conn, "deudas", deuda_id)
        conn.execute("UPDATE deudas SET saldo_actual = ? WHERE id = ?", (body.nuevo_saldo, deuda_id))
        if body.registrar_tx:
            insert_row(conn, "transacciones", TX_COLS, {
                "fecha": body.fecha, "tipo": "transfer", "categoria": "Pago deuda",
                "descripcion": body.descripcion, "monto": body.total_pagado, "notas": body.notas,
            })
        conn.commit()
        return get_row(conn, "deudas", deuda_id)
    finally:
        conn.close()


@app.post("/api/inv/{inv_id}/rendimiento")
def registrar_rendimiento(inv_id: int, body: InvRendimiento):
    conn = db.get_conn()
    try:
        inv = get_row(conn, "inversiones", inv_id)
        nuevo_valor = inv["valor_actual"] + body.monto
        conn.execute("UPDATE inversiones SET valor_actual = ? WHERE id = ?", (nuevo_valor, inv_id))
        if body.registrar_tx:
            insert_row(conn, "transacciones", TX_COLS, {
                "fecha": body.fecha, "tipo": "ingreso", "categoria": "Intereses",
                "descripcion": f"Rendimiento · {inv['nombre']}", "monto": body.monto, "notas": body.notas,
            })
        conn.commit()
        return get_row(conn, "inversiones", inv_id)
    finally:
        conn.close()


@app.post("/api/inv/{inv_id}/aporte")
def aportar_inv(inv_id: int, body: InvAporte):
    conn = db.get_conn()
    try:
        inv = get_row(conn, "inversiones", inv_id)
        nuevo_invertido = inv["monto_invertido"] + body.monto
        conn.execute(
            "UPDATE inversiones SET monto_invertido = ?, valor_actual = ? WHERE id = ?",
            (nuevo_invertido, body.nuevo_valor, inv_id),
        )
        if body.registrar_tx:
            insert_row(conn, "transacciones", TX_COLS, {
                "fecha": body.fecha, "tipo": "gasto", "categoria": "Inversión",
                "descripcion": f"Aporte · {inv['nombre']}", "monto": body.monto, "notas": body.notas,
            })
        conn.commit()
        return get_row(conn, "inversiones", inv_id)
    finally:
        conn.close()


@app.post("/api/inv/{inv_id}/retiro")
def retirar_inv(inv_id: int, body: InvRetiro):
    conn = db.get_conn()
    try:
        inv = get_row(conn, "inversiones", inv_id)
        if body.tipo == "total":
            conn.execute("DELETE FROM inversiones WHERE id = ?", (inv_id,))
            descripcion = f"Retiro total · {inv['nombre']}"
        else:
            if body.saldo_queda is None:
                raise HTTPException(400, "saldo_queda requerido para retiro parcial")
            pct_retiro = (body.monto / inv["valor_actual"]) if inv["valor_actual"] > 0 else 0
            nuevo_invertido = max(0.0, inv["monto_invertido"] * (1 - pct_retiro))
            conn.execute(
                "UPDATE inversiones SET valor_actual = ?, monto_invertido = ? WHERE id = ?",
                (body.saldo_queda, nuevo_invertido, inv_id),
            )
            descripcion = f"Retiro parcial · {inv['nombre']}"
        if body.registrar_tx:
            insert_row(conn, "transacciones", TX_COLS, {
                "fecha": body.fecha, "tipo": "ingreso", "categoria": "Dividendos",
                "descripcion": descripcion, "monto": body.monto, "notas": body.notas,
            })
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@app.post("/api/activo/{activo_id}/venta")
def vender_activo(activo_id: int, body: ActivoVenta):
    conn = db.get_conn()
    try:
        activo = get_row(conn, "activos", activo_id)
        conn.execute("DELETE FROM activos WHERE id = ?", (activo_id,))
        if body.registrar_tx:
            insert_row(conn, "transacciones", TX_COLS, {
                "fecha": body.fecha, "tipo": "ingreso", "categoria": "Venta activos",
                "descripcion": f"Venta · {activo['nombre']}", "monto": body.precio, "notas": body.notas,
            })
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


# ── Static frontend (must come last so /api/* routes above take priority) ───
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
