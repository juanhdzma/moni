import calendar
import datetime
import logging
import re
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from . import db

logger = logging.getLogger("moni")

# Docroot dedicado. Montar la raíz del repo dejaba /backend/data/moni.db, el
# código y el .git descargables por HTTP con un GET y sin auth.
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "public"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="Moni API", lifespan=lifespan)

# ── Anti-CSRF ─────────────────────────────────────────────────────────────────
# Moni no tiene login: cualquiera en la LAN que pueda alcanzar el puerto puede
# usar la API. Lo que sí hay que cerrar es el vector remoto: sin esto, cualquier
# página web que abras podía hacer un <form method=POST> contra /api/truncate y
# borrarte todo (un form cross-origin no necesita leer la respuesta). Un form no
# puede mandar headers custom, y un fetch que sí puede dispara un preflight que
# nadie contesta porque no hay CORS middleware. Con exigir el header alcanza.
CSRF_HEADER = "x-moni-request"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


@app.middleware("http")
async def require_csrf_header(request, call_next):
    if (
        request.method not in SAFE_METHODS
        and request.url.path.startswith("/api/")
        and CSRF_HEADER not in request.headers
    ):
        return JSONResponse({"detail": f"Falta el header {CSRF_HEADER}"}, status_code=403)
    return await call_next(request)


# ── Validación compartida ─────────────────────────────────────────────────────
# Las fechas se guardan como YYYY-MM-DD o YYYY-MM-DDTHH:MM (ver normDate en el
# frontend). Sin este check entraba cualquier string y rompía los charts.
_FECHA_RE = re.compile(r"^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?$")

TipoTx = Literal["ingreso", "gasto", "transfer"]
Monto = Annotated[float, Field(gt=0)]
MontoCero = Annotated[float, Field(ge=0)]


def _check_fecha(v: str, *, requerida: bool) -> str:
    v = (v or "").strip()
    if not v:
        if requerida:
            raise ValueError("fecha requerida")
        return ""
    if not _FECHA_RE.match(v):
        raise ValueError("fecha debe ser YYYY-MM-DD o YYYY-MM-DDTHH:MM")
    return v


def fecha_requerida(*fields: str):
    return field_validator(*fields)(lambda v: _check_fecha(v, requerida=True))


def fecha_opcional(*fields: str):
    return field_validator(*fields)(lambda v: _check_fecha(v, requerida=False))


# ── Models ────────────────────────────────────────────────────────────────────
class TxIn(BaseModel):
    fecha: str
    tipo: TipoTx
    categoria: str = Field(min_length=1)
    descripcion: str = ""
    monto: Monto
    notas: str = ""
    tarjeta_id: Optional[int] = None

    _v_fecha = fecha_requerida("fecha")


class DeudaIn(BaseModel):
    nombre: str = Field(min_length=1)
    monto_inicial: MontoCero
    saldo_actual: MontoCero
    tasa_ea: MontoCero = 0
    cuota_mensual: MontoCero = 0
    fecha_inicio: str = ""
    proxima_cuota: str = ""
    es_tarjeta: bool = False
    cupo: MontoCero = 0
    franquicia: str = ""
    crear_tx: bool = False

    _v_fecha = fecha_opcional("fecha_inicio", "proxima_cuota")


class DeudaAdelanto(BaseModel):
    monto: Monto
    nuevo_saldo: MontoCero
    fecha: str
    descripcion: str
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_requerida("fecha")


class DeudaPago(BaseModel):
    nuevo_saldo: MontoCero
    total_pagado: Monto
    intereses: MontoCero = 0
    fecha: str
    descripcion: str
    notas: str = ""
    registrar_tx: bool = True
    # Solo la cuota mensual corre el vencimiento; un abono extraordinario no.
    avanzar_cuota: bool = False

    _v_fecha = fecha_requerida("fecha")


class InvIn(BaseModel):
    nombre: str = Field(min_length=1)
    tipo: Literal["fija", "variable"]
    monto_invertido: MontoCero
    valor_actual: MontoCero
    tasa_ea: Optional[MontoCero] = None
    fecha_inicio: str = ""
    pago: Optional[Literal["mensual", "vencimiento"]] = None
    dia_pago: Optional[Annotated[int, Field(ge=1, le=31)]] = None
    valor_actualizado_en: str = ""
    crear_tx: bool = False

    _v_fecha = fecha_opcional("fecha_inicio", "valor_actualizado_en")


class InvRendimiento(BaseModel):
    monto: Monto
    fecha: str
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_requerida("fecha")


class InvAporte(BaseModel):
    monto: Monto
    nuevo_valor: MontoCero
    fecha: str
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_requerida("fecha")


class InvRetiro(BaseModel):
    tipo: Literal["total", "parcial"]
    monto: Monto
    saldo_queda: Optional[MontoCero] = None
    fecha: str
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_requerida("fecha")


class ActivoIn(BaseModel):
    nombre: str = Field(min_length=1)
    valor_inicial: MontoCero
    valor_actual: MontoCero
    fecha_adquisicion: str = ""
    valor_actualizado_en: str = ""
    crear_tx: bool = False

    _v_fecha = fecha_opcional("fecha_adquisicion", "valor_actualizado_en")


class ActivoVenta(BaseModel):
    precio: Monto
    fecha: str
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_requerida("fecha")


class RecIn(BaseModel):
    nombre: str = Field(min_length=1)
    tipo: Literal["ingreso", "gasto"]
    monto: Monto
    frecuencia: Literal["semanal", "quincenal", "mensual", "bimestral", "trimestral", "semestral", "anual"]
    activo: bool = True
    fecha_inicio: str = ""
    notas: str = ""

    _v_fecha = fecha_opcional("fecha_inicio")


class ImportPayload(BaseModel):
    transacciones: list[dict] = []
    deudas: list[dict] = []
    inversiones: list[dict] = []
    activos: list[dict] = []
    recurrentes: list[dict] = []


TX_COLS = ["fecha", "tipo", "categoria", "descripcion", "monto", "notas", "tarjeta_id"]
DEUDA_COLS = ["nombre", "monto_inicial", "saldo_actual", "tasa_ea", "cuota_mensual", "fecha_inicio", "proxima_cuota", "es_tarjeta", "cupo", "franquicia"]
INV_COLS = ["nombre", "tipo", "monto_invertido", "valor_actual", "tasa_ea", "fecha_inicio", "pago", "dia_pago", "valor_actualizado_en"]
ACTIVO_COLS = ["nombre", "valor_inicial", "valor_actual", "fecha_adquisicion", "valor_actualizado_en"]
REC_COLS = ["nombre", "tipo", "monto", "frecuencia", "activo", "fecha_inicio", "notas"]

TABLES = {
    "deuda": ("deudas", DEUDA_COLS),
    "inv": ("inversiones", INV_COLS),
    "activo": ("activos", ACTIVO_COLS),
    "rec": ("recurrentes", REC_COLS),
}

# Column lists (incl. id) matching db.SCHEMA, used for full-table export/import/truncate.
# Import order matters: transacciones.tarjeta_id apunta a deudas.id.
# El modelo es el que valida cada fila del backup — sin él entraba cualquier cosa.
IMPORT_TABLES = [
    ("deudas", ["id"] + DEUDA_COLS + ["total_intereses"], DeudaIn),
    ("inversiones", ["id"] + INV_COLS, InvIn),
    ("activos", ["id"] + ACTIVO_COLS, ActivoIn),
    ("recurrentes", ["id"] + REC_COLS, RecIn),
    ("transacciones", ["id"] + TX_COLS, TxIn),
]


def pesos(v: float) -> float:
    """Redondea a pesos enteros, que es la unidad en la que Moni guarda plata.

    Los montos son REAL en SQLite y la prorrata del retiro parcial produce
    fracciones siempre. Sin redondear, un saldo "en cero" termina valiendo
    1.16e-10: la deuda nunca figura como saldada y sigue contando como activa.
    """
    return float(round(v))


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
            if crear_tx and linked_tx and not data.get("es_tarjeta"):
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
            if table == "deudas":
                # Sin esto las tx de la tarjeta quedan apuntando a un id muerto.
                conn.execute("UPDATE transacciones SET tarjeta_id = NULL WHERE tarjeta_id = ?", (row_id,))
            conn.commit()
        finally:
            conn.close()


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


# ── Transacciones (CRUD dedicado: un gasto pagado con tarjeta ajusta la deuda) ─
def _ajustar_saldo_tarjeta(conn, tarjeta_id, delta):
    if tarjeta_id is None or delta == 0:
        return
    tarjeta = conn.execute("SELECT * FROM deudas WHERE id = ?", (tarjeta_id,)).fetchone()
    # Una tarjeta borrada deja tx huérfanas apuntando a ella. Si acá tiramos 400
    # esas tx quedan imposibles de editar Y de borrar (delete_tx pasa por aquí):
    # no hay saldo que ajustar, así que se sigue de largo.
    if tarjeta is None:
        logger.warning("tx apunta a tarjeta %s inexistente; se ignora el ajuste de saldo", tarjeta_id)
        return
    if not tarjeta["es_tarjeta"]:
        raise HTTPException(400, f"tarjeta_id {tarjeta_id} no es una tarjeta válida")
    nuevo_saldo = pesos(tarjeta["saldo_actual"] + delta)
    conn.execute("UPDATE deudas SET saldo_actual = ? WHERE id = ?", (nuevo_saldo, tarjeta_id))
    logger.info(
        "tarjeta %s: saldo_actual %.2f -> %.2f (delta %.2f)",
        tarjeta_id, tarjeta["saldo_actual"], nuevo_saldo, delta,
    )


@app.post("/api/tx", name="create_tx")
def create_tx(body: TxIn):
    conn = db.get_conn()
    try:
        data = body.model_dump()
        new_id = insert_row(conn, "transacciones", TX_COLS, data)
        if data["tipo"] == "gasto":
            _ajustar_saldo_tarjeta(conn, data["tarjeta_id"], data["monto"])
        conn.commit()
        return get_row(conn, "transacciones", new_id)
    finally:
        conn.close()


@app.put("/api/tx/{row_id}", name="update_tx")
def update_tx(row_id: int, body: TxIn):
    conn = db.get_conn()
    try:
        old = get_row(conn, "transacciones", row_id)
        if old["tipo"] == "gasto":
            _ajustar_saldo_tarjeta(conn, old["tarjeta_id"], -old["monto"])
        data = body.model_dump()
        update_row(conn, "transacciones", TX_COLS, row_id, data)
        if data["tipo"] == "gasto":
            _ajustar_saldo_tarjeta(conn, data["tarjeta_id"], data["monto"])
        conn.commit()
        return get_row(conn, "transacciones", row_id)
    finally:
        conn.close()


@app.delete("/api/tx/{row_id}", status_code=204, name="delete_tx")
def delete_tx(row_id: int):
    conn = db.get_conn()
    try:
        old = get_row(conn, "transacciones", row_id)
        if old["tipo"] == "gasto":
            _ajustar_saldo_tarjeta(conn, old["tarjeta_id"], -old["monto"])
        delete_row(conn, "transacciones", row_id)
        conn.commit()
    finally:
        conn.close()


# ── Composite actions (multi-table writes, one SQLite transaction each) ──────
def _sumar_un_mes(fecha: str) -> str:
    """Corre la fecha un mes calendario, anclando el día (31 ene → 28/29 feb)."""
    d = datetime.date.fromisoformat(fecha[:10])
    y, m = (d.year + 1, 1) if d.month == 12 else (d.year, d.month + 1)
    return d.replace(year=y, month=m, day=min(d.day, calendar.monthrange(y, m)[1])).isoformat()


def _proxima_cuota_despues_del_pago(deuda: dict, body: DeudaPago) -> Optional[str]:
    """Nueva proxima_cuota, o None si no hay que tocarla.

    Sin esto la fecha quedaba congelada: el dashboard mostraba la cuota como
    vencida para siempre y, al pasar la ventana de atrasos, la deuda dejaba de
    aparecer en próximas operaciones y no volvía nunca.
    """
    if deuda["es_tarjeta"] or not deuda["proxima_cuota"]:
        return None
    if body.nuevo_saldo <= 0:
        return ""  # saldada: ya no hay próxima cuota
    return _sumar_un_mes(deuda["proxima_cuota"]) if body.avanzar_cuota else None


@app.post("/api/deuda/{deuda_id}/pago")
def pagar_deuda(deuda_id: int, body: DeudaPago):
    conn = db.get_conn()
    try:
        deuda = get_row(conn, "deudas", deuda_id)
        if body.nuevo_saldo > deuda["saldo_actual"]:
            raise HTTPException(400, "El saldo después del pago no puede superar el saldo actual")
        conn.execute(
            "UPDATE deudas SET saldo_actual = ?, total_intereses = total_intereses + ? WHERE id = ?",
            (pesos(body.nuevo_saldo), pesos(body.intereses), deuda_id),
        )
        proxima = _proxima_cuota_despues_del_pago(deuda, body)
        if proxima is not None:
            conn.execute("UPDATE deudas SET proxima_cuota = ? WHERE id = ?", (proxima, deuda_id))
        if body.registrar_tx:
            insert_row(conn, "transacciones", TX_COLS, {
                "fecha": body.fecha, "tipo": "transfer", "categoria": "Pago deuda",
                "descripcion": body.descripcion, "monto": body.total_pagado, "notas": body.notas,
            })
        conn.commit()
        return get_row(conn, "deudas", deuda_id)
    finally:
        conn.close()


@app.post("/api/deuda/{deuda_id}/adelanto")
def pedir_adelanto(deuda_id: int, body: DeudaAdelanto):
    conn = db.get_conn()
    try:
        tarjeta = get_row(conn, "deudas", deuda_id)
        if not tarjeta["es_tarjeta"]:
            raise HTTPException(400, "Solo las tarjetas admiten adelantos")
        if body.nuevo_saldo < tarjeta["saldo_actual"]:
            raise HTTPException(400, "El saldo después del adelanto no puede ser menor al saldo actual")
        conn.execute("UPDATE deudas SET saldo_actual = ? WHERE id = ?", (pesos(body.nuevo_saldo), deuda_id))
        if body.registrar_tx:
            insert_row(conn, "transacciones", TX_COLS, {
                "fecha": body.fecha, "tipo": "ingreso", "categoria": "Avance de tarjeta",
                "descripcion": body.descripcion, "monto": body.monto, "notas": body.notas,
            })
        conn.commit()
        logger.info(
            "tarjeta %s: adelanto %.2f, saldo_actual %.2f -> %.2f",
            deuda_id, body.monto, tarjeta["saldo_actual"], body.nuevo_saldo,
        )
        return get_row(conn, "deudas", deuda_id)
    finally:
        conn.close()


@app.post("/api/inv/{inv_id}/rendimiento")
def registrar_rendimiento(inv_id: int, body: InvRendimiento):
    conn = db.get_conn()
    try:
        inv = get_row(conn, "inversiones", inv_id)
        nuevo_valor = pesos(inv["valor_actual"] + body.monto)
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
        nuevo_invertido = pesos(inv["monto_invertido"] + body.monto)
        conn.execute(
            "UPDATE inversiones SET monto_invertido = ?, valor_actual = ?, valor_actualizado_en = ? WHERE id = ?",
            (nuevo_invertido, pesos(body.nuevo_valor), body.fecha, inv_id),
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
            if body.saldo_queda > inv["valor_actual"]:
                raise HTTPException(400, "El saldo que queda no puede superar el valor actual")
            pct_retiro = (body.monto / inv["valor_actual"]) if inv["valor_actual"] > 0 else 0
            nuevo_invertido = pesos(max(0.0, inv["monto_invertido"] * (1 - pct_retiro)))
            conn.execute(
                "UPDATE inversiones SET valor_actual = ?, monto_invertido = ?, valor_actualizado_en = ? WHERE id = ?",
                (pesos(body.saldo_queda), nuevo_invertido, body.fecha, inv_id),
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


# ── Backup: import / truncate ─────────────────────────────────────────────────
def _validar_fila_import(table, model, row, idx):
    if not isinstance(row, dict):
        raise HTTPException(400, f"{table}[{idx}]: se esperaba un objeto")
    try:
        limpia = model.model_validate(row).model_dump()
    except Exception as e:
        raise HTTPException(400, f"{table}[{idx}] inválido: {e}")
    # El modelo no cubre id ni total_intereses (no se mandan al crear).
    for extra in ("id", "total_intereses"):
        if extra in row and row[extra] is not None:
            if not isinstance(row[extra], (int, float)) or isinstance(row[extra], bool):
                raise HTTPException(400, f"{table}[{idx}].{extra} debe ser numérico")
            limpia[extra] = row[extra]
    return limpia


@app.post("/api/import")
def import_data(body: ImportPayload):
    payload = body.model_dump()
    validadas = {
        table: [_validar_fila_import(table, model, r, i) for i, r in enumerate(payload.get(table) or [])]
        for table, _cols, model in IMPORT_TABLES
    }
    conn = db.get_conn()
    try:
        counts = {}
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
    finally:
        conn.close()


@app.post("/api/truncate")
def truncate_all():
    conn = db.get_conn()
    try:
        for table, _cols, _model in IMPORT_TABLES:
            conn.execute(f"DELETE FROM {table}")
            conn.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


# ── Static frontend (must come last so /api/* routes above take priority) ───
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
