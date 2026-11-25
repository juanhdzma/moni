from pydantic import BaseModel

from ..deuda import ClaseDeuda, Franquicia
from .comun import Nivel, Segmento, TextoVacio


class DeudaCruda(BaseModel):
    id: int
    nombre: str
    monto_inicial: float
    saldo_actual: float
    tasa_ea: float
    cuota_mensual: float
    fecha_inicio: str
    proxima_cuota: str
    cupo: float
    franquicia: Franquicia
    total_intereses: float
    clase_deuda: ClaseDeuda


class SugerenciaPago(BaseModel):
    monto: float | None
    nuevo_saldo: float | None
    hint: str


class PagoSugerido(BaseModel):
    cuota: SugerenciaPago
    abono: SugerenciaPago
    liquidar: SugerenciaPago


class FrasesDeuda(BaseModel):
    detalle: str
    meses_restantes_texto: str | None
    progreso_texto: str
    intereses_texto: str | None
    intereses_ayuda: str
    disponible_texto: str | None
    intereses_saldada_texto: str | None
    saldada_badge: str
    capital_pagado_texto: str


class Deuda(DeudaCruda):
    progreso_pct: float
    capital_pagado: float
    nivel_progreso: Nivel
    tono_progreso: str
    tiene_cupo: bool
    disponible: float | None
    uso_pct: float
    nivel_uso: Nivel
    tono_uso: str
    pago: PagoSugerido
    frases: FrasesDeuda


class DatoResumenDeudas(BaseModel):
    cuotas: str
    cuotas_sufijo: str
    intereses: str | None
    intereses_sufijo: str


class ResumenDeudas(BaseModel):
    total: float
    segmentos: list[Segmento]
    creditos: list[Deuda]
    tarjetas: list[Deuda]
    terminadas: list[Deuda]
    texto_vacio_creditos: TextoVacio
    texto_vacio_tarjetas: TextoVacio
    dato: DatoResumenDeudas


class PreviewPago(BaseModel):
    capital: float
    intereses: float


class PreviewAdelanto(BaseModel):
    nuevo_saldo: float
    comision: float
