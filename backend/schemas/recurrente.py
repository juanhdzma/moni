from typing import Literal

from ..calculos.operaciones.frecuencias import FRECUENCIAS
from .validadores import Entrada, MontoPesos, Nombre, Notas, fecha_opcional

Frecuencia = Literal[tuple(FRECUENCIAS)]


class RecIn(Entrada):
    nombre: Nombre
    tipo: Literal["ingreso", "gasto"]
    monto: MontoPesos
    frecuencia: Frecuencia
    activo: bool = True
    fecha_inicio: str = ""
    notas: Notas = ""

    _v_fecha = fecha_opcional("fecha_inicio")
