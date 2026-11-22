import re
from typing import Annotated, Literal, Optional

from pydantic import Field, field_validator

from ..calculos.listados import COLUMNAS_ORDEN
from ..calculos.dinero import PERIODOS_EVOLUCION, PERIODOS_GASTOS
from ..core.ops_ocultas import parse_clave

_FECHA_RE = re.compile(r"^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?$")

TipoTx = Literal["ingreso", "gasto", "transfer"]
ColumnaTx = Literal[COLUMNAS_ORDEN]
TasaTipo = Literal["ea", "mv"]
PeriodoGastos = Literal[PERIODOS_GASTOS]
PeriodoEvolucion = Literal[PERIODOS_EVOLUCION]
Monto = Annotated[float, Field(gt=0)]
MontoCero = Annotated[float, Field(ge=0)]


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
