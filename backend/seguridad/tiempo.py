import datetime
from typing import Optional

from ..calculos.base.fechas import TZ


def ahora() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def iso(dt: datetime.datetime) -> str:
    return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


def texto_bogota(valor: Optional[str]) -> str:
    if not valor:
        return "nunca"
    return desde_iso(valor).astimezone(TZ).strftime("%Y-%m-%d %H:%M")


def desde_iso(valor: str) -> datetime.datetime:
    return datetime.datetime.strptime(valor, "%Y-%m-%dT%H:%M:%S").replace(tzinfo=datetime.timezone.utc)
