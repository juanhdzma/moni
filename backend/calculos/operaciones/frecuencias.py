import datetime
import math
from typing import Optional

from ..base.fechas import parse_fecha, sumar_meses

FRECUENCIAS = {
    "semanal": {"label": "Semanal", "factor": 52 / 12, "dias": 7},
    "quincenal": {"label": "Quincenal", "factor": 2, "dias": 14},
    "mensual": {"label": "Mensual", "factor": 1, "meses": 1},
    "bimestral": {"label": "Bimestral", "factor": 1 / 2, "meses": 2},
    "trimestral": {"label": "Trimestral", "factor": 1 / 3, "meses": 3},
    "semestral": {"label": "Semestral", "factor": 1 / 6, "meses": 6},
    "anual": {"label": "Anual", "factor": 1 / 12, "meses": 12},
}


def opciones_frecuencia() -> list[dict]:
    return [{"value": clave, "label": info["label"]} for clave, info in FRECUENCIAS.items()]


def frecuencia_label(frecuencia: str) -> str:
    info = FRECUENCIAS.get(frecuencia)
    return info["label"] if info else frecuencia


def to_mensual(monto: float, frecuencia: str) -> float:
    info = FRECUENCIAS.get(frecuencia)
    return monto * (info["factor"] if info else 1)


def proxima_fecha_recurrente(fecha_inicio: str, frecuencia: str, hoy: datetime.date) -> Optional[datetime.date]:
    start = parse_fecha(fecha_inicio)
    info = FRECUENCIAS.get(frecuencia)
    if not start or not info:
        return None
    dias = info.get("dias", 0)
    if dias:
        periodos = max(0, math.ceil((hoy - start).days / dias))
        return start + datetime.timedelta(days=periodos * dias)
    meses = info["meses"]
    k = max(0, math.ceil(((hoy.year - start.year) * 12 + hoy.month - start.month) / meses))
    nxt = sumar_meses(start, k * meses, start.day)
    while nxt < hoy:
        k += 1
        nxt = sumar_meses(start, k * meses, start.day)
    return nxt
