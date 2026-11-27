from ..calculos import operaciones
from ..calculos.base.fechas import mes_corto, parse_fecha
from ..calculos.operaciones.proximas import FUENTES_OPS, parse_clave, sin_ocultas
from .estado import filas


def ocultar_op(conn, clave, ahora):
    if not clave:
        return
    tipo, fuente_id, fecha = parse_clave(clave)
    conn.execute(
        "INSERT OR IGNORE INTO ops_ocultas (clave, tipo, fuente_id, fecha, creada_en) VALUES (?, ?, ?, ?, ?)",
        (clave, tipo, fuente_id, fecha, ahora),
    )


def candidatas(conn, hoy):
    return operaciones.calcular_proximas_operaciones(
        filas(conn, "deudas"), filas(conn, "inversiones"), filas(conn, "recurrentes"), hoy
    )


def candidatas_visibles(conn, hoy):
    return sin_ocultas(candidatas(conn, hoy), claves_ocultas(conn))


def claves_ocultas(conn) -> set[str]:
    return {r["clave"] for r in conn.execute("SELECT clave FROM ops_ocultas")}


def podar_ocultas(conn, hoy):
    vigentes = list(operaciones.claves_vigentes(candidatas(conn, hoy)))
    if not vigentes:
        conn.execute("DELETE FROM ops_ocultas")
        return
    conn.execute(f"DELETE FROM ops_ocultas WHERE clave NOT IN ({', '.join('?' * len(vigentes))})", vigentes)


TIPO_OP = {"deuda": "Cuota", "inversion": "Rendimiento", "recurrente": "Recurrente"}
TEXTO_SIN_FUENTE = "ya no existe"
TEXTO_VACIO_OCULTAS = "Ninguna operación oculta."


def _fecha_legible(fecha: str) -> str:
    d = parse_fecha(fecha)
    return fecha if d is None else f"{d.day} {mes_corto(d.month)} {d.year}"


def texto_op_oculta(tipo: str, nombre: str | None, fecha: str) -> str:
    return f"{TIPO_OP.get(tipo, tipo)} · {nombre or TEXTO_SIN_FUENTE} · {_fecha_legible(fecha)}"


def ocultas_con_etiqueta(conn) -> list[dict]:
    nombres = {
        tipo: {r["id"]: r["nombre"] for r in conn.execute(f"SELECT id, nombre FROM {tabla}")}
        for tipo, tabla in FUENTES_OPS.items()
    }
    ocultas = conn.execute("SELECT clave, tipo, fuente_id, fecha FROM ops_ocultas ORDER BY creada_en, clave")
    filas = []
    for r in ocultas:
        etiqueta = nombres[r["tipo"]].get(r["fuente_id"])
        filas.append({**dict(r), "etiqueta": etiqueta, "texto": texto_op_oculta(r["tipo"], etiqueta, r["fecha"])})
    return filas
