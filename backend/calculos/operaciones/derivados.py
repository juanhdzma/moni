import datetime
import math

from ..fechas import es_desactualizado, texto_dias_corto
from ..listados import tiene_saldo
from ..numeros import porcentaje
from .finanzas import ea_a_mv, intereses_pagados, proxima_fecha_inversion, rendimiento_mensual_fija
from .frecuencias import frecuencia_label, proxima_fecha_recurrente, to_mensual


def _nivel(valor: float, alto: float, medio: float) -> str:
    return "alto" if valor >= alto else "medio" if valor >= medio else "bajo"


def _proximo_pago(fecha: datetime.date, hoy: datetime.date) -> dict:
    dias = (fecha - hoy).days
    return {"fecha": fecha.isoformat(), "dias": dias, "texto": texto_dias_corto(dias)}


def derivar_deuda(fila: dict) -> dict:
    saldo = fila["saldo_actual"]
    inicial = fila["monto_inicial"]
    cuota = fila["cuota_mensual"]
    cupo = fila.get("cupo") or 0
    activa = tiene_saldo(fila)
    uso = min(100, saldo / cupo * 100) if cupo > 0 else 0
    progreso = (1 - saldo / inicial) * 100 if inicial > 0 else 0
    return {
        **fila,
        "activa": activa,
        "vigente": bool(fila.get("es_tarjeta")) or activa,
        "progreso_pct": progreso,
        "capital_pagado": inicial - saldo,
        "meses_restantes": math.ceil(saldo / cuota) if cuota > 0 else None,
        "nivel_progreso": _nivel(progreso, 75, 40),
        "intereses_pagados": intereses_pagados(fila),
        "disponible": max(0, cupo - saldo) if cupo > 0 else None,
        "uso_pct": uso,
        "nivel_uso": _nivel(uso, 90, 60),
    }


def derivar_inversion(fila: dict, hoy: datetime.date) -> dict:
    ganancia = fila["valor_actual"] - fila["monto_invertido"]
    tasa = fila.get("tasa_ea")
    fija = fila["tipo"] == "fija"
    dia = fila.get("dia_pago")
    return {
        **fila,
        "ganancia": ganancia,
        "ganancia_pct": porcentaje(ganancia, fila["monto_invertido"]),
        "tasa_mv": ea_a_mv(tasa) if fija and tasa else None,
        "proximo_pago": _proximo_pago(proxima_fecha_inversion(dia, hoy), hoy) if fila.get("pago") == "mensual" and dia else None,
        "rendimiento_esperado": rendimiento_mensual_fija(fila["valor_actual"], tasa) if tasa else None,
        "desactualizada": fila["tipo"] == "variable" and es_desactualizado(fila.get("valor_actualizado_en"), hoy),
    }


def derivar_activo(fila: dict, hoy: datetime.date) -> dict:
    cambio = fila["valor_actual"] - fila["valor_inicial"]
    return {
        **fila,
        "cambio": cambio,
        "cambio_pct": porcentaje(cambio, fila["valor_inicial"]),
        "desactualizado": es_desactualizado(fila.get("valor_actualizado_en"), hoy),
    }


def derivar_recurrente(fila: dict, hoy: datetime.date) -> dict:
    activo = bool(fila["activo"])
    prox = proxima_fecha_recurrente(fila["fecha_inicio"], fila["frecuencia"], hoy) if activo else None
    return {
        **fila,
        "activo": activo,
        "frecuencia_label": frecuencia_label(fila["frecuencia"]),
        "mensual": to_mensual(fila["monto"], fila["frecuencia"]),
        "proximo_pago": _proximo_pago(prox, hoy) if prox else None,
    }
