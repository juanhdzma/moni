from typing import Literal

from pydantic import BaseModel

from .comun import ProximoPago, Segmento, TextoVacio


class InvCruda(BaseModel):
    id: int
    nombre: str
    tipo: Literal["fija", "variable"]
    monto_invertido: float
    valor_actual: float
    tasa_ea: float | None
    fecha_inicio: str
    pago: Literal["mensual", "vencimiento"] | None
    dia_pago: int | None


class Inversion(InvCruda):
    capitaliza_default: bool
    accion_principal: Literal["rendimiento", "valor"]
    ganancia: float
    ganancia_tono: str
    ganancia_signo: str
    ganancia_pct: float
    monto_retiro_total: float
    texto_tasa: str | None
    proximo_pago: ProximoPago | None
    rendimiento_esperado: float | None
    desactualizado: bool


class ResumenInversiones(BaseModel):
    total_actual: float
    ganancia: float
    ganancia_tono: str
    ganancia_signo: str
    ganancia_pct: float
    mostrar_ganancia: bool
    texto_ganancia: str
    segmentos: list[Segmento]
    fijas: list[Inversion]
    variables: list[Inversion]
    texto_posiciones: str
    texto_vacio_fijas: TextoVacio
    texto_vacio_variables: TextoVacio


class PreviewAporte(BaseModel):
    nuevo_valor_estimado: float
    texto_estimado: str
