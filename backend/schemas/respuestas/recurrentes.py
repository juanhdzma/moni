from typing import Literal

from pydantic import BaseModel

from .comun import Frase, ProximoPago, Segmento, TextoVacio


class RecCruda(BaseModel):
    id: int
    nombre: str
    tipo: Literal["ingreso", "gasto"]
    monto: float
    frecuencia: str
    activo: int
    fecha_inicio: str
    notas: str


class Recurrente(RecCruda):
    activo: bool
    frecuencia_label: str
    mensual: float
    proximo_pago: ProximoPago | None
    categoria_sugerida: str


class ResumenRecurrentes(BaseModel):
    neto_mensual: float
    neto_mensual_tono: str
    neto_mensual_signo: str
    dato: Frase
    segmentos: list[Segmento]
    ingresos: list[Recurrente]
    gastos: list[Recurrente]
    texto_vacio_ingresos: TextoVacio
    texto_vacio_gastos: TextoVacio


class Pausa(BaseModel):
    id: int
    activo: bool
