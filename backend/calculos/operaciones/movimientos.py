import datetime
from dataclasses import dataclass
from typing import Optional

from ...core.montos import pesos
from ..fechas import sumar_meses


class ErrorDeDominio(ValueError):
    status = 400

    def __init__(self, mensaje: str):
        super().__init__(mensaje)
        self.mensaje = mensaje


@dataclass(frozen=True)
class RetiroParcial:
    valor_actual: float
    monto_invertido: float


def retiro_parcial(
    valor_actual: float, monto_invertido: float, monto: float, saldo_queda: Optional[float]
) -> RetiroParcial:
    if saldo_queda is None:
        raise ErrorDeDominio("saldo_queda requerido para retiro parcial")
    if saldo_queda > valor_actual:
        raise ErrorDeDominio("El saldo que queda no puede superar el valor actual")
    pct_retiro = (monto / valor_actual) if valor_actual > 0 else 0
    return RetiroParcial(
        valor_actual=pesos(saldo_queda),
        monto_invertido=pesos(max(0.0, monto_invertido * (1 - pct_retiro))),
    )


def valor_estimado_tras_aporte(valor_actual: float, monto: float) -> float:
    return valor_actual + monto


def validar_pago(saldo_actual: float, nuevo_saldo: float) -> None:
    if nuevo_saldo > saldo_actual:
        raise ErrorDeDominio("El saldo después del pago no puede superar el saldo actual")


def validar_adelanto(es_tarjeta: bool, saldo_actual: float, nuevo_saldo: float) -> None:
    if not es_tarjeta:
        raise ErrorDeDominio("Solo las tarjetas admiten adelantos")
    if nuevo_saldo < saldo_actual:
        raise ErrorDeDominio("El saldo después del adelanto no puede ser menor al saldo actual")


def sumar_un_mes(fecha: str) -> str:
    d = datetime.date.fromisoformat(fecha[:10])
    return sumar_meses(d, 1, d.day).isoformat()


def proxima_cuota_tras_pago(
    es_tarjeta: bool, proxima_cuota: Optional[str], nuevo_saldo: float, avanzar_cuota: bool
) -> Optional[str]:
    if es_tarjeta or not proxima_cuota:
        return None
    if nuevo_saldo <= 0:
        return ""
    return sumar_un_mes(proxima_cuota) if avanzar_cuota else None
