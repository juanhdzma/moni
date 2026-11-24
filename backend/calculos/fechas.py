import calendar
import datetime
import math
import re
from typing import Optional
from zoneinfo import ZoneInfo

from .constantes import DIAS_DESACTUALIZADO

TZ = ZoneInfo("America/Bogota")

MESES_CORTOS = ("ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic.")
MESES = (
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
)

_ISO_HORA = re.compile(r"^\d{4}-\d{2}-\d{2}[T ]")
_ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_LEGACY = re.compile(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[\s,]+(\d{1,2}:\d{2}))?")


def ahora_bogota() -> datetime.datetime:
    return datetime.datetime.now(TZ)


def hoy_bogota() -> datetime.date:
    return ahora_bogota().date()


def ahora_bogota_iso() -> str:
    return ahora_bogota().strftime("%Y-%m-%dT%H:%M")


def normalizar_fecha(s: Optional[str]) -> str:
    if not s:
        return ""
    s = str(s).strip()
    if _ISO_HORA.match(s):
        return s[:10] + "T" + s[11:16]
    if _ISO.match(s):
        return s
    m = _LEGACY.match(s)
    if m:
        iso = f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
        return f"{iso}T{m.group(4).zfill(5)}" if m.group(4) else iso
    return s


def parse_fecha(s: Optional[str]) -> Optional[datetime.date]:
    try:
        return datetime.date.fromisoformat(normalizar_fecha(s)[:10])
    except ValueError:
        return None


def parse_fecha_hora(s: Optional[str]) -> Optional[datetime.datetime]:
    norm = normalizar_fecha(s)
    d = parse_fecha(norm)
    if d is None:
        return None
    hora = datetime.time(0, 0)
    if len(norm) >= 16 and norm[10] == "T":
        try:
            hora = datetime.time.fromisoformat(norm[11:16])
        except ValueError:
            return None
    return datetime.datetime.combine(d, hora)


def es_fecha_iso(s: str) -> bool:
    forma_iso = bool(_ISO.match(s) or _ISO_HORA.match(s)) and len(s) in (10, 16, 19)
    return forma_iso and parse_fecha_hora(s) is not None


def mes_de(s: Optional[str]) -> str:
    return normalizar_fecha(s)[:7]


def sumar_meses(base: datetime.date, n: int, dia: int) -> datetime.date:
    idx = base.year * 12 + base.month - 1 + n
    y, m = idx // 12, idx % 12 + 1
    return datetime.date(y, m, min(dia, calendar.monthrange(y, m)[1]))


def restar_meses(d: datetime.datetime, n: int) -> datetime.datetime:
    f = sumar_meses(d.date(), -n, d.day)
    return datetime.datetime.combine(f, d.time())


def mes_corto(m: int) -> str:
    return MESES_CORTOS[m - 1]


def nombre_mes(m: int) -> str:
    return MESES[m - 1]


def texto_dias(dias: int) -> str:
    if dias == 0:
        return "hoy"
    if dias == 1:
        return "mañana"
    if dias < 0:
        return f"vencido {abs(dias)}d"
    return f"en {dias}d"


def texto_dias_corto(dias: int) -> str:
    return "hoy" if dias == 0 else f"en {dias}d"


def redondear_js(x: float) -> int:
    return math.floor(x + 0.5)


def es_desactualizado(fecha: Optional[str], hoy: datetime.date, dias: int = DIAS_DESACTUALIZADO) -> bool:
    d = parse_fecha(fecha) if fecha else None
    if d is None:
        return False
    ahora = datetime.datetime.combine(hoy, datetime.time(12), TZ)
    return ahora - datetime.datetime.combine(d, datetime.time(12), TZ) >= datetime.timedelta(days=dias)
