from ..calculos import operaciones
from ..calculos.operaciones import listados
from ..calculos.catalogo.categorias import categorias_con_custom
from .sql import get_row


def filas(conn, table):
    return [dict(r) for r in conn.execute(f"SELECT * FROM {table} ORDER BY id")]


def categorias(conn):
    return categorias_con_custom(conn.execute("SELECT tipo, nombre FROM categorias ORDER BY rowid"))


def nombres_categorias(conn, tipo):
    return {r["nombre"] for r in conn.execute("SELECT nombre FROM categorias WHERE tipo = ?", (tipo,))}


def agregar_categoria(conn, tipo, nombre):
    conn.execute("INSERT INTO categorias (tipo, nombre) VALUES (?, ?)", (tipo, nombre))


def borrar_categoria(conn, tipo, nombre):
    return conn.execute("DELETE FROM categorias WHERE tipo = ? AND nombre = ?", (tipo, nombre)).rowcount


def ajustes(conn):
    pares = {r["clave"]: r["valor"] for r in conn.execute("SELECT clave, valor FROM ajustes")}
    return {"moneda_simbolo": pares.get("moneda_simbolo", "$")}


def guardar_moneda_simbolo(conn, valor):
    conn.execute(
        "INSERT INTO ajustes (clave, valor) VALUES ('moneda_simbolo', ?) "
        "ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
        (valor,),
    )


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


def cargar_estado(conn, hoy, nombres=tuple(DERIVADORES)):
    por_id = _deudas_por_id(conn) if "transacciones" in nombres else None
    return {nombre: _derivar(conn, nombre, hoy, por_id) for nombre in nombres}


def coleccion(conn, nombre, hoy):
    por_id = _deudas_por_id(conn) if nombre == "transacciones" else None
    return _derivar(conn, nombre, hoy, por_id)


def detalle(conn, nombre, row_id, hoy):
    por_id = _deudas_por_id(conn) if nombre == "transacciones" else None
    return DERIVADORES[nombre](get_row(conn, nombre, row_id), hoy, por_id)
