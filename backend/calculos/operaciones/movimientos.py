from dataclasses import dataclass
from typing import Optional

from ..catalogo.constantes import CATEGORIAS_SISTEMA
from ..base.errores import ErrorDeDominio
from ..base.fechas import parse_fecha, sumar_meses
from ..base.numeros import pesos
from . import asientos
from .finanzas import desglose_pago
from .frases_deuda import descripcion_credito, descripcion_pago


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
        valor_actual=saldo_queda,
        monto_invertido=pesos(max(0.0, monto_invertido * (1 - pct_retiro))),
    )


def valor_estimado_tras_aporte(valor_actual: float, monto: float) -> float:
    return valor_actual + monto


def validar_pago(saldo_actual: float, nuevo_saldo: float, liquidar: bool = False) -> None:
    if nuevo_saldo > saldo_actual:
        raise ErrorDeDominio("El saldo después del pago no puede superar el saldo actual")
    if liquidar and nuevo_saldo != 0:
        raise ErrorDeDominio("Para liquidar, el saldo después del pago debe ser 0")


def validar_adelanto(es_tarjeta: bool, saldo_actual: float, nuevo_saldo: float) -> None:
    if not es_tarjeta:
        raise ErrorDeDominio("Solo las tarjetas admiten adelantos")
    if nuevo_saldo < saldo_actual:
        raise ErrorDeDominio("El saldo después del adelanto no puede ser menor al saldo actual")


def sumar_un_mes(fecha: str) -> str:
    d = parse_fecha(fecha)
    if d is None:
        raise ErrorDeDominio(f"Fecha inválida: {fecha}")
    return sumar_meses(d, 1, d.day).isoformat()


def proxima_cuota_tras_pago(
    es_tarjeta: bool, proxima_cuota: Optional[str], nuevo_saldo: float, avanzar_cuota: bool
) -> Optional[str]:
    if es_tarjeta or not proxima_cuota:
        return None
    if nuevo_saldo <= 0:
        return ""
    return sumar_un_mes(proxima_cuota) if avanzar_cuota else None


@dataclass(frozen=True)
class PagoAplicado:
    saldo_actual: float
    intereses: float
    proxima_cuota: Optional[str]
    tx: dict


def aplicar_pago(
    deuda: dict, *, total_pagado: float, nuevo_saldo: float, intereses: Optional[float], avanzar_cuota: bool,
    fecha: str, descripcion: str, notas: str, simbolo: str, liquidar: bool = False,
) -> PagoAplicado:
    validar_pago(deuda["saldo_actual"], nuevo_saldo, liquidar)
    desglose = desglose_pago(deuda["saldo_actual"], total_pagado, nuevo_saldo)
    intereses_pago = desglose["intereses"] if intereses is None else intereses
    return PagoAplicado(
        saldo_actual=pesos(nuevo_saldo),
        intereses=pesos(intereses_pago),
        proxima_cuota=proxima_cuota_tras_pago(
            bool(deuda["es_tarjeta"]), deuda["proxima_cuota"], nuevo_saldo, avanzar_cuota
        ),
        tx={
            "fecha": fecha, "tipo": "transfer", "categoria": CATEGORIAS_SISTEMA["transfer"]["pago_deuda"],
            "descripcion": descripcion or descripcion_pago(deuda["nombre"], desglose["capital"], intereses_pago, simbolo),
            "monto": total_pagado, "notas": notas,
        },
    )


def saldo_tras_adelanto(
    cupo: Optional[float], nuevo_saldo: Optional[float], disponible_nuevo: Optional[float]
) -> float:
    if nuevo_saldo is not None:
        return nuevo_saldo
    if not cupo:
        raise ErrorDeDominio("La tarjeta no tiene cupo definido")
    return cupo - disponible_nuevo


def tx_credito_recibido(deuda: dict) -> dict:
    return {
        "fecha": deuda["fecha_inicio"], "tipo": "ingreso", "categoria": CATEGORIAS_SISTEMA["ingreso"]["credito_recibido"],
        "descripcion": descripcion_credito(deuda["nombre"]),
        "monto": deuda["monto_inicial"] or deuda["saldo_actual"], "notas": "",
    }


def validar_cambio_de_tipo(es_tarjeta_actual: bool, es_tarjeta_nuevo: bool, tiene_tx_ligadas: bool) -> None:
    if es_tarjeta_actual != es_tarjeta_nuevo and tiene_tx_ligadas:
        raise ErrorDeDominio("No se puede cambiar el tipo de una deuda que tiene movimientos ligados")


@dataclass(frozen=True)
class CambioInversion:
    cambios: dict
    tx: Optional[dict] = None
    borrar: bool = False


def aplicar_valor(nuevo_valor: float, fecha: str) -> dict:
    return {"valor_actual": nuevo_valor, "valor_actualizado_en": fecha}


def aplicar_rendimiento(
    inv: dict, monto: float, fecha: str, notas: str, capitaliza: bool, registrar_tx: bool
) -> CambioInversion:
    if capitaliza:
        return CambioInversion(aplicar_valor(pesos(inv["valor_actual"] + monto), fecha))
    tx = asientos.tx_rendimiento(inv["nombre"], monto, fecha, notas) if registrar_tx else None
    return CambioInversion({}, tx)


def aplicar_aporte(
    inv: dict, monto: float, nuevo_valor: Optional[float], fecha: str, notas: str, registrar_tx: bool
) -> CambioInversion:
    if nuevo_valor is None:
        nuevo_valor = pesos(valor_estimado_tras_aporte(inv["valor_actual"], monto))
    cambios = {"monto_invertido": pesos(inv["monto_invertido"] + monto), **aplicar_valor(nuevo_valor, fecha)}
    tx = asientos.tx_aporte(inv["nombre"], monto, fecha, notas) if registrar_tx else None
    return CambioInversion(cambios, tx)


def aplicar_retiro(
    inv: dict, tipo: str, monto: float, saldo_queda: Optional[float], fecha: str, notas: str, registrar_tx: bool
) -> CambioInversion:
    if tipo == "total":
        prefijo, cambios, borrar = "retiro_total", {}, True
    else:
        nuevo = retiro_parcial(inv["valor_actual"], inv["monto_invertido"], monto, saldo_queda)
        prefijo, borrar = "retiro_parcial", False
        cambios = {
            "valor_actual": nuevo.valor_actual,
            "monto_invertido": nuevo.monto_invertido,
            "valor_actualizado_en": fecha,
        }
    tx = asientos.tx_retiro(prefijo, inv["nombre"], monto, fecha, notas) if registrar_tx else None
    return CambioInversion(cambios, tx, borrar)


def alternar_activo(rec: dict) -> bool:
    return not rec["activo"]
