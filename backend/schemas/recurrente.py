from typing import Literal

from pydantic import BaseModel

from ..calculos.operaciones.frecuencias import FRECUENCIAS
from .validadores import Monto, Nombre, fecha_opcional

Frecuencia = Literal[tuple(FRECUENCIAS)]


class RecIn(BaseModel):
    nombre: Nombre
    tipo: Literal["ingreso", "gasto"]
    monto: Monto
    frecuencia: Frecuencia
    activo: bool = True
    fecha_inicio: str = ""
    notas: str = ""

    _v_fecha = fecha_opcional("fecha_inicio")
