from typing import Annotated, Literal, Optional

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, field_validator

from ..calculos.constantes import (
    DESCRIPCION_LARGO_MAX,
    NOMBRE_LARGO_MAX,
    NOTAS_LARGO_MAX,
    SERIES_EVOLUCION,
    TIPOS_TASA,
    TIPOS_TX,
    valores,
)
from ..calculos.dinero import PERIODOS_EVOLUCION, PERIODOS_GASTOS
from ..calculos.fechas import es_fecha_iso, normalizar_fecha
from ..calculos.listados import COLUMNAS_ORDEN
from ..calculos.numeros import pesos
from ..calculos.operaciones.proximas import parse_clave

TipoTx = Literal[valores(TIPOS_TX)]
ColumnaTx = Literal[COLUMNAS_ORDEN]
TasaTipo = Literal[valores(TIPOS_TASA)]
SerieEvolucion = Literal[valores(SERIES_EVOLUCION)]
PeriodoGastos = Literal[PERIODOS_GASTOS]
PeriodoEvolucion = Literal[PERIODOS_EVOLUCION]


class Entrada(BaseModel):
    model_config = ConfigDict(extra="forbid")


def _a_pesos(v: float) -> float:
    redondeado = pesos(v)
    if redondeado <= 0:
        raise ValueError("Debe ser mayor que 0")
    return redondeado


MontoPesos = Annotated[float, Field(gt=0, allow_inf_nan=False), AfterValidator(_a_pesos)]
MontoCero = Annotated[float, Field(ge=0, allow_inf_nan=False), AfterValidator(pesos)]
Tasa = Annotated[float, Field(ge=0, allow_inf_nan=False)]
Nombre = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=NOMBRE_LARGO_MAX)]
Descripcion = Annotated[str, Field(max_length=DESCRIPCION_LARGO_MAX)]
Notas = Annotated[str, Field(max_length=NOTAS_LARGO_MAX)]


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
    return normalizar_fecha(v)


def fecha_requerida(*fields: str):
    return field_validator(*fields)(lambda v: validar_fecha(v, requerida=True))


def fecha_opcional(*fields: str):
    return field_validator(*fields)(lambda v: validar_fecha(v, requerida=False))


def clave_opcional(*fields: str):
    return field_validator(*fields)(_check_clave)
