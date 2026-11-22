from ..calculos import listados, operaciones
from ..calculos.fechas import hoy_bogota


def filas(conn, table):
    return [dict(r) for r in conn.execute(f"SELECT * FROM {table} ORDER BY id")]


def categorias(conn):
    return listados.categorias_con_custom(conn.execute("SELECT tipo, nombre FROM categorias ORDER BY rowid"))


def ajustes(conn):
    pares = {r["clave"]: r["valor"] for r in conn.execute("SELECT clave, valor FROM ajustes")}
    return {"moneda_simbolo": pares.get("moneda_simbolo", "$")}


def cargar_estado(conn, hoy):
    deudas = filas(conn, "deudas")
    por_id = {d["id"]: d for d in deudas}
    return {
        "transacciones": [listados.derivar_tx(t, por_id) for t in filas(conn, "transacciones")],
        "deudas": [operaciones.derivar_deuda(d) for d in deudas],
        "inversiones": [operaciones.derivar_inversion(i, hoy) for i in filas(conn, "inversiones")],
        "activos": [operaciones.derivar_activo(a, hoy) for a in filas(conn, "activos")],
        "recurrentes": [operaciones.derivar_recurrente(r, hoy) for r in filas(conn, "recurrentes")],
    }


def coleccion(conn, nombre):
    return cargar_estado(conn, hoy_bogota())[nombre]


def conteos(estado):
    return {"activos": len(estado["activos"]), "inversiones": len(estado["inversiones"])}
