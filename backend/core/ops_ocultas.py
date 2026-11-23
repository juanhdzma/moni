import datetime
import re

from ..calculos import operaciones
from ..calculos.fechas import TZ, parse_fecha
from .estado import filas

FUENTES_OPS = {"deuda": "deudas", "inversion": "inversiones", "recurrente": "recurrentes"}
_CLAVE_OP_RE = re.compile(rf"^({'|'.join(FUENTES_OPS)}):(\d+):(\d{{4}}-\d{{2}}-\d{{2}})$")


def parse_clave(clave: str) -> tuple[str, int, str]:
    m = _CLAVE_OP_RE.match(clave or "")
    if not m or parse_fecha(m.group(3)) is None:
        raise ValueError("clave de operación inválida")
    return m.group(1), int(m.group(2)), m.group(3)


def ocultar_op(conn, clave):
    tipo, fuente_id, fecha = parse_clave(clave)
    cur = conn.execute(
        "INSERT OR IGNORE INTO ops_ocultas (clave, tipo, fuente_id, fecha, creada_en) VALUES (?, ?, ?, ?, ?)",
        (clave, tipo, fuente_id, fecha, datetime.datetime.now(TZ).isoformat(timespec="seconds")),
    )
    return cur.rowcount


def candidatas(conn, hoy):
    return operaciones.calcular_proximas_operaciones(
        filas(conn, "deudas"), filas(conn, "inversiones"), filas(conn, "recurrentes"), hoy
    )


def claves_ocultas(conn) -> set[str]:
    return {r["clave"] for r in conn.execute("SELECT clave FROM ops_ocultas")}


def podar_ocultas(conn, hoy):
    vigentes = operaciones.claves_vigentes(candidatas(conn, hoy))
    if vigentes:
        conn.execute(f"DELETE FROM ops_ocultas WHERE clave NOT IN ({', '.join('?' * len(vigentes))})", list(vigentes))
