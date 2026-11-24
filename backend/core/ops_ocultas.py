from ..calculos import operaciones
from ..calculos.fechas import ahora_bogota_iso
from ..calculos.operaciones.proximas import FUENTES_OPS, parse_clave
from .estado import filas


def ocultar_op(conn, clave):
    tipo, fuente_id, fecha = parse_clave(clave)
    cur = conn.execute(
        "INSERT OR IGNORE INTO ops_ocultas (clave, tipo, fuente_id, fecha, creada_en) VALUES (?, ?, ?, ?, ?)",
        (clave, tipo, fuente_id, fecha, ahora_bogota_iso()),
    )
    return cur.rowcount


def candidatas(conn, hoy):
    return operaciones.calcular_proximas_operaciones(
        filas(conn, "deudas"), filas(conn, "inversiones"), filas(conn, "recurrentes"), hoy
    )


def claves_ocultas(conn) -> set[str]:
    return {r["clave"] for r in conn.execute("SELECT clave FROM ops_ocultas")}


def podar_ocultas(conn, hoy):
    vigentes = list(operaciones.claves_vigentes(candidatas(conn, hoy)))
    if not vigentes:
        conn.execute("DELETE FROM ops_ocultas")
        return
    conn.execute(f"DELETE FROM ops_ocultas WHERE clave NOT IN ({', '.join('?' * len(vigentes))})", vigentes)


def ocultas_con_etiqueta(conn) -> list[dict]:
    nombres = {
        tipo: {r["id"]: r["nombre"] for r in conn.execute(f"SELECT id, nombre FROM {tabla}")}
        for tipo, tabla in FUENTES_OPS.items()
    }
    ocultas = conn.execute("SELECT clave, tipo, fuente_id, fecha FROM ops_ocultas ORDER BY creada_en, clave")
    return [{**dict(r), "etiqueta": nombres[r["tipo"]].get(r["fuente_id"])} for r in ocultas]
