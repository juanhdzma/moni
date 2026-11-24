from typing import Annotated, Literal, Optional

from pydantic import AfterValidator, Field, StringConstraints, field_validator

from ..calculos.constantes import SERIES_EVOLUCION, valores
from ..calculos.dinero import PERIODOS_EVOLUCION, PERIODOS_GASTOS
from ..calculos.fechas import es_fecha_iso
from ..calculos.numeros import pesos
from ..calculos.listados import COLUMNAS_ORDEN
from ..calculos.operaciones.proximas import parse_clave

TipoTx = Literal["ingreso", "gasto", "transfer"]
ColumnaTx = Literal[COLUMNAS_ORDEN]
TasaTipo = Literal["ea", "mv"]
SerieEvolucion = Literal[valores(SERIES_EVOLUCION)]
PeriodoGastos = Literal[PERIODOS_GASTOS]
PeriodoEvolucion = Literal[PERIODOS_EVOLUCION]
Monto = Annotated[float, Field(gt=0, allow_inf_nan=False)]


def _a_pesos(v: float) -> float:
    redondeado = pesos(v)
    if redondeado <= 0:
        raise ValueError("Debe ser mayor que 0")
    return redondeado


MontoPesos = Annotated[float, Field(gt=0, allow_inf_nan=False), AfterValidator(_a_pesos)]
MontoCero = Annotated[float, Field(ge=0, allow_inf_nan=False)]
Nombre = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


def _check_clave(v: Optional[str]) -> Optional[str]:
    if v is not None:
        parse_clave(v)
    return v


def validar_fecha(v: str, *, requerida: bool) -> str:
    v = (v or "").strip()
    if not v:
        if requerida:
            raise ValueError("fecha requerida")
        return ""
    if not es_fecha_iso(v):
        raise ValueError("fecha debe ser YYYY-MM-DD o YYYY-MM-DDTHH:MM")
    return v


def fecha_requerida(*fields: str):
    return field_validator(*fields)(lambda v: validar_fecha(v, requerida=True))


def fecha_opcional(*fields: str):
    return field_validator(*fields)(lambda v: validar_fecha(v, requerida=False))


def clave_opcional(*fields: str):
    return field_validator(*fields)(_check_clave)
