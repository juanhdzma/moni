from typing import Literal, Optional

from pydantic import BaseModel, Field

from ..calculos.operaciones.frecuencias import FRECUENCIAS
from .validadores import Monto, fecha_opcional

Frecuencia = Literal[tuple(FRECUENCIAS)]


class RecIn(BaseModel):
    nombre: str = Field(min_length=1)
    tipo: Literal["ingreso", "gasto"]
    monto: Monto
    frecuencia: Frecuencia
    activo: Optional[bool] = None
    fecha_inicio: str = ""
    notas: str = ""

    _v_fecha = fecha_opcional("fecha_inicio")
