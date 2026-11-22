from typing import Literal

from pydantic import BaseModel, Field

from .validadores import Monto, fecha_opcional


class RecIn(BaseModel):
    nombre: str = Field(min_length=1)
    tipo: Literal["ingreso", "gasto"]
    monto: Monto
    frecuencia: Literal["semanal", "quincenal", "mensual", "bimestral", "trimestral", "semestral", "anual"]
    activo: bool = True
    fecha_inicio: str = ""
    notas: str = ""

    _v_fecha = fecha_opcional("fecha_inicio")
