import asyncio
import calendar
import datetime
import logging
import re
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from . import auth, auth_routes, db, passkeys_routes, push, push_routes
from .calculos import dinero, listados, operaciones
from .calculos.fechas import TZ, hoy_bogota, parse_fecha

logger = logging.getLogger("moni")

# Docroot dedicado: solo el build de React (web/dist). Montar la raíz del repo
# dejaba /backend/data/moni.db, el código y el .git descargables por HTTP con un
# GET y sin auth; web/src y web/package.json tampoco se sirven.
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "web" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    push.public_key()
    conn = db.get_conn()
    try:
        _podar_ocultas(conn, hoy_bogota())
        conn.commit()
    finally:
        conn.close()
    tarea = asyncio.create_task(push.loop_diario())
    yield
    tarea.cancel()


app = FastAPI(title="Moni API", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

# ── Anti-CSRF ─────────────────────────────────────────────────────────────────
# Con sesión por cookie SameSite=Strict ya no basta confiar en el navegador:
# un form cross-origin no puede mandar headers custom, así que exigir este
# header en las mutaciones cierra el vector aunque la cookie viajara.
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


app.middleware("http")(auth.middleware_auth)
app.middleware("http")(auth.middleware_headers)
app.include_router(auth_routes.router)
app.include_router(passkeys_routes.router)
app.include_router(push_routes.router)


# ── Validación compartida ─────────────────────────────────────────────────────
# Las fechas se guardan como YYYY-MM-DD o YYYY-MM-DDTHH:MM (ver normDate en el
# frontend). Sin este check entraba cualquier string y rompía los charts.
_FECHA_RE = re.compile(r"^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?$")

TipoTx = Literal["ingreso", "gasto", "transfer"]
Monto = Annotated[float, Field(gt=0)]
MontoCero = Annotated[float, Field(ge=0)]


_CLAVE_OP_RE = re.compile(r"^(deuda|inversion|recurrente):(\d+):(\d{4}-\d{2}-\d{2})$")


def parse_clave(clave: str) -> tuple[str, int, str]:
    m = _CLAVE_OP_RE.match(clave or "")
    if not m or parse_fecha(m.group(3)) is None:
        raise ValueError("clave de operación inválida")
    return m.group(1), int(m.group(2)), m.group(3)


def _check_clave(v: Optional[str]) -> Optional[str]:
    if v is not None:
        parse_clave(v)
    return v


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


def clave_opcional(*fields: str):
    return field_validator(*fields)(_check_clave)


# ── Models ────────────────────────────────────────────────────────────────────
class TxIn(BaseModel):
    fecha: str
    tipo: TipoTx
    categoria: str = Field(min_length=1)
    descripcion: str = ""
    monto: Monto
    notas: str = ""
    tarjeta_id: Optional[int] = None
    op_clave: Optional[str] = None

    _v_fecha = fecha_requerida("fecha")
    _v_clave = clave_opcional("op_clave")


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
    op_clave: Optional[str] = None

    _v_fecha = fecha_requerida("fecha")
    _v_clave = clave_opcional("op_clave")


class InvIn(BaseModel):
    nombre: str = Field(min_length=1)
    tipo: Literal["fija", "variable"]
    monto_invertido: MontoCero
    valor_actual: MontoCero
    tasa_ea: Optional[MontoCero] = None
    tasa_tipo: Literal["ea", "mv"] = "ea"
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
    # Dónde queda el rendimiento: adentro de la inversión (capitaliza) o en tu
    # cuenta. Son excluyentes y hay que saber cuál es — ver registrar_rendimiento.
    capitaliza: bool = False
    op_clave: Optional[str] = None

    _v_fecha = fecha_requerida("fecha")
    _v_clave = clave_opcional("op_clave")


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


CATEGORIAS_SISTEMA = listados.CATEGORIAS_SISTEMA
CAT_INGRESO = CATEGORIAS_SISTEMA["ingreso"]
CAT_GASTO = CATEGORIAS_SISTEMA["gasto"]
CAT_TRANSFER = CATEGORIAS_SISTEMA["transfer"]


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


def ocultar_op(conn, clave):
    tipo, fuente_id, fecha = parse_clave(clave)
    cur = conn.execute(
        "INSERT OR IGNORE INTO ops_ocultas (clave, tipo, fuente_id, fecha, creada_en) VALUES (?, ?, ?, ?, ?)",
        (clave, tipo, fuente_id, fecha, datetime.datetime.now(TZ).isoformat(timespec="seconds")),
    )
    return cur.rowcount


def _filas(conn, table):
    return [dict(r) for r in conn.execute(f"SELECT * FROM {table} ORDER BY id")]


def _categorias(conn):
    return listados.categorias_con_custom(conn.execute("SELECT tipo, nombre FROM categorias ORDER BY rowid"))


def _ajustes(conn):
    filas = {r["clave"]: r["valor"] for r in conn.execute("SELECT clave, valor FROM ajustes")}
    return {"moneda_simbolo": filas.get("moneda_simbolo", "$")}


def _estado(conn, hoy):
    deudas = _filas(conn, "deudas")
    por_id = {d["id"]: d for d in deudas}
    return {
        "transacciones": [listados.derivar_tx(t, por_id) for t in _filas(conn, "transacciones")],
        "deudas": [operaciones.derivar_deuda(d) for d in deudas],
        "inversiones": [operaciones.derivar_inversion(i, hoy) for i in _filas(conn, "inversiones")],
        "activos": [operaciones.derivar_activo(a, hoy) for a in _filas(conn, "activos")],
        "recurrentes": [operaciones.derivar_recurrente(r, hoy) for r in _filas(conn, "recurrentes")],
    }


def _conteos(estado):
    return {"activos": len(estado["activos"]), "inversiones": len(estado["inversiones"])}


# ── GET /api/all ──────────────────────────────────────────────────────────────
@app.get("/api/all")
def get_all():
    conn = db.get_conn()
    try:
        hoy = hoy_bogota()
        estado = _estado(conn, hoy)
        return {
            **estado,
            "hoy": hoy.isoformat(),
            "mes_actual": hoy.isoformat()[:7],
            "ajustes": _ajustes(conn),
            "categorias": _categorias(conn),
            "alertas": listados.alertas(estado["activos"], estado["inversiones"], hoy),
            "conteos": _conteos(estado),
        }
    finally:
        conn.close()


# ── Generic CRUD factory ─────────────────────────────────────────────────────
def _normalizar_tasa(data):
    tipo = data.pop("tasa_tipo", "ea")
    if tipo == "mv" and data.get("tasa_ea"):
        data["tasa_ea"] = operaciones.mv_a_ea(data["tasa_ea"])
    return data


def register_crud(path, model, linked_tx=None):
    table, cols = TABLES[path]

    @app.post(f"/api/{path}", name=f"create_{path}")
    def create(body: model):
        conn = db.get_conn()
        try:
            data = _normalizar_tasa(body.model_dump())
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
            data = _normalizar_tasa(body.model_dump())
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
    "tipo": "ingreso", "categoria": CAT_INGRESO["credito_recibido"], "fecha_field": "fecha_inicio",
    "desc_fn": lambda d: f"Crédito · {d['nombre']}",
    "monto_fn": lambda d: d.get("monto_inicial") or d["saldo_actual"],
})
register_crud("inv", InvIn, linked_tx={
    "tipo": "gasto", "categoria": CAT_GASTO["inversion"], "fecha_field": "fecha_inicio",
    "desc_fn": lambda d: f"Nueva inversión · {d['nombre']}",
    "monto_fn": lambda d: d["monto_invertido"],
})
register_crud("activo", ActivoIn, linked_tx={
    "tipo": "gasto", "categoria": CAT_GASTO["compra_activos"], "fecha_field": "fecha_adquisicion",
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
        if data["op_clave"]:
            ocultar_op(conn, data["op_clave"])
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
                "fecha": body.fecha, "tipo": "transfer", "categoria": CAT_TRANSFER["pago_deuda"],
                "descripcion": body.descripcion, "monto": body.total_pagado, "notas": body.notas,
            })
        if body.op_clave:
            ocultar_op(conn, body.op_clave)
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
                "fecha": body.fecha, "tipo": "ingreso", "categoria": CAT_INGRESO["avance_tarjeta"],
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
    """Un rendimiento cuenta de UN solo lado, nunca de los dos.

    Antes esto subía valor_actual y además insertaba el ingreso, así que el
    patrimonio subía dos veces por el mismo peso: un CDT de 1.000.000 que paga
    95.000 quedaba mostrando 1.190.000. Si capitaliza, la plata sigue adentro de
    la inversión y no entró a la cartera; si te la pagan, salió de la inversión
    y su valor no se mueve.
    """
    conn = db.get_conn()
    try:
        inv = get_row(conn, "inversiones", inv_id)
        if body.capitaliza:
            conn.execute(
                "UPDATE inversiones SET valor_actual = ?, valor_actualizado_en = ? WHERE id = ?",
                (pesos(inv["valor_actual"] + body.monto), body.fecha, inv_id),
            )
        elif body.registrar_tx:
            insert_row(conn, "transacciones", TX_COLS, {
                "fecha": body.fecha, "tipo": "ingreso", "categoria": CAT_INGRESO["intereses"],
                "descripcion": f"Rendimiento · {inv['nombre']}", "monto": body.monto, "notas": body.notas,
            })
        if body.op_clave:
            ocultar_op(conn, body.op_clave)
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
                "fecha": body.fecha, "tipo": "gasto", "categoria": CAT_GASTO["inversion"],
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
                "fecha": body.fecha, "tipo": "ingreso", "categoria": CAT_INGRESO["dividendos"],
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
                "fecha": body.fecha, "tipo": "ingreso", "categoria": CAT_INGRESO["venta_activos"],
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
        conn.execute("DELETE FROM categorias")
        conn.execute("DELETE FROM ops_ocultas")
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


# ── Lectura calculada ─────────────────────────────────────────────────────────
@app.get("/api/dashboard/resumen")
def dashboard_resumen():
    conn = db.get_conn()
    try:
        hoy = hoy_bogota()
        estado = _estado(conn, hoy)
        resumen = dinero.resumen_dashboard(estado, hoy)
        return {**resumen, "partes": dinero.partes_patrimonio(resumen, _conteos(estado))}
    finally:
        conn.close()


@app.get("/api/dashboard/evolucion")
def dashboard_evolucion(
    serie: Literal["patrimonio", "inversiones"] = "patrimonio",
    periodo: Literal["1M", "3M", "6M", "1Y", "ALL"] = "6M",
):
    conn = db.get_conn()
    try:
        hoy = hoy_bogota()
        return dinero.evolucion(_estado(conn, hoy), serie, periodo, hoy)
    finally:
        conn.close()


@app.get("/api/dashboard/este-mes")
def dashboard_este_mes():
    conn = db.get_conn()
    try:
        hoy = hoy_bogota()
        return dinero.este_mes(_estado(conn, hoy), hoy)
    finally:
        conn.close()


@app.get("/api/dashboard/gastos")
def dashboard_gastos(periodo: Literal["1W", "1M", "3M", "6M", "1Y", "ALL"] = "1M"):
    conn = db.get_conn()
    try:
        hoy = hoy_bogota()
        return dinero.gastos_periodo(_estado(conn, hoy)["transacciones"], periodo, hoy)
    finally:
        conn.close()


@app.get("/api/dashboard/movimientos")
def dashboard_movimientos(n: Annotated[int, Query(ge=1, le=50)] = 5):
    conn = db.get_conn()
    try:
        return {"items": dinero.movimientos_recientes(_estado(conn, hoy_bogota())["transacciones"], n)}
    finally:
        conn.close()


@app.get("/api/tx")
def listar_tx(
    col: Literal["fecha", "tipo", "categoria", "descripcion", "monto"] = "fecha",
    dir: Literal["1", "-1"] = "-1",
    tipo: str = "",
    mes: str = "",
    cat: str = "",
):
    conn = db.get_conn()
    try:
        hoy = hoy_bogota()
        return listados.listar_transacciones(_estado(conn, hoy)["transacciones"], col, int(dir), tipo, mes, cat, hoy)
    finally:
        conn.close()


@app.get("/api/deudas/resumen")
def deudas_resumen():
    conn = db.get_conn()
    try:
        return operaciones.resumen_deudas(_estado(conn, hoy_bogota())["deudas"])
    finally:
        conn.close()


@app.get("/api/inv/resumen")
def inv_resumen():
    conn = db.get_conn()
    try:
        return operaciones.resumen_inversiones(_estado(conn, hoy_bogota())["inversiones"])
    finally:
        conn.close()


@app.get("/api/activos/resumen")
def activos_resumen():
    conn = db.get_conn()
    try:
        return operaciones.resumen_activos(_estado(conn, hoy_bogota())["activos"])
    finally:
        conn.close()


@app.get("/api/rec/resumen")
def rec_resumen():
    conn = db.get_conn()
    try:
        return operaciones.resumen_recurrentes(_estado(conn, hoy_bogota())["recurrentes"])
    finally:
        conn.close()


@app.get("/api/calc/tasa")
def calc_tasa(valor: float, tipo: Literal["ea", "mv"] = "ea"):
    if valor <= 0:
        return {"ea": None, "mv": None}
    if tipo == "ea":
        return {"ea": valor, "mv": operaciones.ea_a_mv(valor)}
    return {"ea": operaciones.mv_a_ea(valor), "mv": valor}


# ── Previews (no mutan) ───────────────────────────────────────────────────────
class PagoPreview(BaseModel):
    total_pagado: MontoCero
    nuevo_saldo: MontoCero


class AdelantoPreview(BaseModel):
    monto: MontoCero
    nuevo_saldo: MontoCero


class NuevoValor(BaseModel):
    nuevo_valor: MontoCero


class MontoPreview(BaseModel):
    monto: MontoCero


class PrecioPreview(BaseModel):
    precio: MontoCero


@app.post("/api/deuda/{deuda_id}/pago/preview")
def pago_preview(deuda_id: int, body: PagoPreview):
    conn = db.get_conn()
    try:
        deuda = get_row(conn, "deudas", deuda_id)
        return operaciones.desglose_pago(deuda["saldo_actual"], body.total_pagado, body.nuevo_saldo)
    finally:
        conn.close()


@app.post("/api/deuda/{deuda_id}/adelanto/preview")
def adelanto_preview(deuda_id: int, body: AdelantoPreview):
    conn = db.get_conn()
    try:
        deuda = get_row(conn, "deudas", deuda_id)
        return {"comision": operaciones.comision_adelanto(deuda["saldo_actual"], body.monto, body.nuevo_saldo)}
    finally:
        conn.close()


@app.post("/api/inv/{inv_id}/valor/preview")
def inv_valor_preview(inv_id: int, body: NuevoValor):
    conn = db.get_conn()
    try:
        inv = get_row(conn, "inversiones", inv_id)
        return operaciones.cambio_valor(body.nuevo_valor, inv["valor_actual"], inv["monto_invertido"])
    finally:
        conn.close()


@app.post("/api/inv/{inv_id}/aporte/preview")
def inv_aporte_preview(inv_id: int, body: MontoPreview):
    conn = db.get_conn()
    try:
        inv = get_row(conn, "inversiones", inv_id)
        return {"nuevo_valor_estimado": inv["valor_actual"] + body.monto}
    finally:
        conn.close()


@app.post("/api/activo/{activo_id}/valor/preview")
def activo_valor_preview(activo_id: int, body: NuevoValor):
    conn = db.get_conn()
    try:
        activo = get_row(conn, "activos", activo_id)
        return operaciones.cambio_valor(body.nuevo_valor, activo["valor_actual"], activo["valor_inicial"])
    finally:
        conn.close()


@app.post("/api/activo/{activo_id}/venta/preview")
def activo_venta_preview(activo_id: int, body: PrecioPreview):
    conn = db.get_conn()
    try:
        return operaciones.preview_venta_activo(get_row(conn, "activos", activo_id), body.precio)
    finally:
        conn.close()


# ── Próximas operaciones y ops ocultas ────────────────────────────────────────
class OpOculta(BaseModel):
    clave: str

    _v_clave = clave_opcional("clave")


def _podar_ocultas(conn, hoy):
    candidatas = operaciones.calcular_proximas_operaciones(
        _filas(conn, "deudas"), _filas(conn, "inversiones"), _filas(conn, "recurrentes"), hoy
    )
    vigentes = operaciones.claves_vigentes(candidatas)
    if vigentes:
        conn.execute(f"DELETE FROM ops_ocultas WHERE clave NOT IN ({', '.join('?' * len(vigentes))})", list(vigentes))


@app.get("/api/proximas-operaciones")
def proximas_operaciones():
    conn = db.get_conn()
    try:
        hoy = hoy_bogota()
        candidatas = operaciones.calcular_proximas_operaciones(
            _filas(conn, "deudas"), _filas(conn, "inversiones"), _filas(conn, "recurrentes"), hoy
        )
        ocultas = {r["clave"] for r in conn.execute("SELECT clave FROM ops_ocultas")}
        return operaciones.armar_proximas(candidatas, ocultas, hoy)
    finally:
        conn.close()


OPS_FUENTES = {"deuda": "deudas", "inversion": "inversiones", "recurrente": "recurrentes"}


@app.get("/api/ops-ocultas")
def listar_ops_ocultas():
    conn = db.get_conn()
    try:
        items = []
        for r in conn.execute("SELECT clave, tipo, fuente_id, fecha FROM ops_ocultas ORDER BY creada_en, clave").fetchall():
            fuente = conn.execute(
                f"SELECT nombre FROM {OPS_FUENTES[r['tipo']]} WHERE id = ?", (r["fuente_id"],)
            ).fetchone()
            items.append({**dict(r), "etiqueta": fuente["nombre"] if fuente else None})
        return {"items": items}
    finally:
        conn.close()


@app.post("/api/ops-ocultas", status_code=201)
def crear_op_oculta(body: OpOculta):
    conn = db.get_conn()
    try:
        ocultar_op(conn, body.clave)
        conn.commit()
        return {"clave": body.clave}
    finally:
        conn.close()


@app.delete("/api/ops-ocultas", status_code=204)
def borrar_ops_ocultas(clave: Optional[str] = None):
    conn = db.get_conn()
    try:
        if clave is None:
            conn.execute("DELETE FROM ops_ocultas")
        elif conn.execute("DELETE FROM ops_ocultas WHERE clave = ?", (clave,)).rowcount == 0:
            raise HTTPException(404, "operación oculta no encontrada")
        conn.commit()
    finally:
        conn.close()


# ── Categorías y ajustes ──────────────────────────────────────────────────────
class CategoriaIn(BaseModel):
    tipo: TipoTx
    nombre: str


class AjustesIn(BaseModel):
    moneda_simbolo: str

    @field_validator("moneda_simbolo")
    @classmethod
    def _simbolo(cls, v: str) -> str:
        return listados.validar_simbolo(v)


class MigracionLocal(BaseModel):
    categorias: dict[str, list[Annotated[str, Field(max_length=60)]]] = Field(default={}, max_length=10)
    ops_ocultas: list[Annotated[str, Field(max_length=100)]] = Field(default=[], max_length=500)
    moneda_simbolo: Optional[str] = None


@app.get("/api/categorias")
def get_categorias():
    conn = db.get_conn()
    try:
        return _categorias(conn)
    finally:
        conn.close()


@app.post("/api/categorias", status_code=201)
def crear_categoria(body: CategoriaIn):
    conn = db.get_conn()
    try:
        existentes = {r["nombre"] for r in conn.execute("SELECT nombre FROM categorias WHERE tipo = ?", (body.tipo,))}
        try:
            nombre = listados.validar_categoria(body.tipo, body.nombre, existentes)
        except listados.CategoriaDuplicada as e:
            raise HTTPException(409, str(e))
        except ValueError as e:
            raise HTTPException(422, str(e))
        conn.execute("INSERT INTO categorias (tipo, nombre) VALUES (?, ?)", (body.tipo, nombre))
        conn.commit()
        return _categorias(conn)
    finally:
        conn.close()


@app.delete("/api/categorias")
def borrar_categoria(tipo: TipoTx, nombre: str):
    conn = db.get_conn()
    try:
        if listados.es_categoria_sistema(tipo, nombre):
            raise HTTPException(409, "las categorías de sistema no se pueden borrar")
        if conn.execute("DELETE FROM categorias WHERE tipo = ? AND nombre = ?", (tipo, nombre)).rowcount == 0:
            raise HTTPException(404, "categoría no encontrada")
        conn.commit()
        return _categorias(conn)
    finally:
        conn.close()


@app.get("/api/ajustes")
def get_ajustes():
    conn = db.get_conn()
    try:
        return _ajustes(conn)
    finally:
        conn.close()


@app.put("/api/ajustes")
def put_ajustes(body: AjustesIn):
    conn = db.get_conn()
    try:
        conn.execute(
            "INSERT INTO ajustes (clave, valor) VALUES ('moneda_simbolo', ?) "
            "ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
            (body.moneda_simbolo,),
        )
        conn.commit()
        return _ajustes(conn)
    finally:
        conn.close()


@app.post("/api/migrar-local")
def migrar_local(body: MigracionLocal):
    conn = db.get_conn()
    try:
        categorias = 0
        for tipo, nombres in body.categorias.items():
            if tipo not in listados.TIPOS:
                continue
            for nombre in nombres[:200]:
                limpio = nombre.strip()
                if limpio and not listados.es_categoria_sistema(tipo, limpio):
                    categorias += conn.execute(
                        "INSERT OR IGNORE INTO categorias (tipo, nombre) VALUES (?, ?)", (tipo, limpio)
                    ).rowcount
        ops = 0
        for clave in body.ops_ocultas:
            try:
                ops += ocultar_op(conn, clave)
            except ValueError:
                continue
        simbolo = False
        if body.moneda_simbolo is not None:
            try:
                limpio = listados.validar_simbolo(body.moneda_simbolo)
                simbolo = conn.execute(
                    "INSERT OR IGNORE INTO ajustes (clave, valor) VALUES ('moneda_simbolo', ?)", (limpio,)
                ).rowcount > 0
            except ValueError:
                pass
        conn.commit()
        return {"categorias": categorias, "ops_ocultas": ops, "moneda_simbolo": simbolo}
    finally:
        conn.close()


# ── Static frontend (must come last so /api/* routes above take priority) ───
if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
else:
    logger.error("%s no existe: el frontend responde 404. Corré `npm run build` en web/.", FRONTEND_DIR)
