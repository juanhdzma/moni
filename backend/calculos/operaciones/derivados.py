import datetime

from ..fechas import es_desactualizado, texto_dias_corto
from ..constantes import clase_deuda_de, tiene_saldo
from ..formato import porcentaje_texto
from ..numeros import porcentaje
from .finanzas import ea_a_mv, proxima_fecha_inversion, rendimiento_esperado
from .sugerencias_pago import sugerencia_pago
from .frecuencias import frecuencia_label, proxima_fecha_recurrente, to_mensual


def _nivel(valor: float, alto: float, medio: float) -> str:
    return "alto" if valor >= alto else "medio" if valor >= medio else "bajo"


TONO_PROGRESO = {"alto": "positivo", "medio": "alerta", "bajo": "negativo"}
TONO_USO = {"alto": "negativo", "medio": "alerta", "bajo": "positivo"}


def _proximo_pago(fecha: datetime.date, hoy: datetime.date) -> dict:
    dias = (fecha - hoy).days
    return {"fecha": fecha.isoformat(), "texto": texto_dias_corto(dias)}


def es_vigente(fila: dict) -> bool:
    return bool(fila.get("es_tarjeta")) or tiene_saldo(fila)


def derivar_deuda(fila: dict) -> dict:
    saldo = fila["saldo_actual"]
    inicial = fila["monto_inicial"]
    cupo = fila.get("cupo") or 0
    activa = tiene_saldo(fila)
    uso = min(100, saldo / cupo * 100) if cupo > 0 else 0
    progreso = min(100, max(0, (1 - saldo / inicial) * 100)) if inicial > 0 else 0
    nivel_progreso = _nivel(progreso, 75, 40)
    nivel_uso = _nivel(uso, 90, 60)
    return {
        **fila,
        "es_tarjeta": bool(fila.get("es_tarjeta")),
        "clase_deuda": clase_deuda_de(fila.get("es_tarjeta")),
        "activa": activa,
        "vigente": es_vigente(fila),
        "progreso_pct": progreso,
        "capital_pagado": inicial - saldo,
        "nivel_progreso": nivel_progreso,
        "tono_progreso": TONO_PROGRESO[nivel_progreso],
        "tiene_cupo": cupo > 0,
        "disponible": max(0, cupo - saldo) if cupo > 0 else None,
        "uso_pct": uso,
        "nivel_uso": nivel_uso,
        "tono_uso": TONO_USO[nivel_uso],
        "pago": sugerencia_pago(saldo, fila["cuota_mensual"]),
    }


def derivar_inversion(fila: dict, hoy: datetime.date) -> dict:
    ganancia = fila["valor_actual"] - fila["monto_invertido"]
    tasa = fila.get("tasa_ea")
    fija = fila["tipo"] == "fija"
    dia = fila.get("dia_pago")
    tasa_mv = ea_a_mv(tasa) if fija and tasa else None
    return {
        **fila,
        "capitaliza_default": fila.get("pago") == "vencimiento",
        "ganancia": ganancia,
        "ganancia_pct": porcentaje(ganancia, fila["monto_invertido"]),
        "texto_tasa": None if tasa_mv is None else f"{porcentaje_texto(tasa, 2)}% EA · {porcentaje_texto(tasa_mv, 4)}% MV",
        "proximo_pago": _proximo_pago(proxima_fecha_inversion(dia, hoy), hoy) if fila.get("pago") == "mensual" and dia else None,
        "rendimiento_esperado": rendimiento_esperado(fila),
        "desactualizado": fila["tipo"] == "variable" and es_desactualizado(fila.get("valor_actualizado_en"), hoy),
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
