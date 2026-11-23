from ..calculos import listados, operaciones
from ..calculos.fechas import hoy_bogota
from .sql import get_row


def filas(conn, table):
    return [dict(r) for r in conn.execute(f"SELECT * FROM {table} ORDER BY id")]


def categorias(conn):
    return listados.categorias_con_custom(conn.execute("SELECT tipo, nombre FROM categorias ORDER BY rowid"))


def ajustes(conn):
    pares = {r["clave"]: r["valor"] for r in conn.execute("SELECT clave, valor FROM ajustes")}
    return {"moneda_simbolo": pares.get("moneda_simbolo", "$")}


def simbolo(conn):
    return ajustes(conn)["moneda_simbolo"]


DERIVADORES = {
    "transacciones": lambda t, hoy, por_id: listados.derivar_tx(t, por_id),
    "deudas": lambda d, hoy, por_id: operaciones.derivar_deuda(d),
    "inversiones": lambda i, hoy, por_id: operaciones.derivar_inversion(i, hoy),
    "activos": lambda a, hoy, por_id: operaciones.derivar_activo(a, hoy),
    "recurrentes": lambda r, hoy, por_id: operaciones.derivar_recurrente(r, hoy),
}


def _deudas_por_id(conn):
    return {d["id"]: d for d in filas(conn, "deudas")}


def _derivar(conn, nombre, hoy, por_id):
    derivar = DERIVADORES[nombre]
    return [derivar(fila, hoy, por_id) for fila in filas(conn, nombre)]


def cargar_estado(conn, hoy):
    por_id = _deudas_por_id(conn)
    return {nombre: _derivar(conn, nombre, hoy, por_id) for nombre in DERIVADORES}


def coleccion(conn, nombre):
    por_id = _deudas_por_id(conn) if nombre == "transacciones" else None
    return _derivar(conn, nombre, hoy_bogota(), por_id)


def detalle(conn, nombre, row_id):
    por_id = _deudas_por_id(conn) if nombre == "transacciones" else None
    return DERIVADORES[nombre](get_row(conn, nombre, row_id), hoy_bogota(), por_id)


def conteos(conn):
    return {
        nombre: conn.execute(f"SELECT COUNT(*) FROM {nombre}").fetchone()[0]
        for nombre in ("activos", "inversiones")
    }
