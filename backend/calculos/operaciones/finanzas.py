import datetime
import math
from typing import Optional

from ..fechas import redondear_js, sumar_meses
from ..numeros import porcentaje


def ea_a_mv(ea: float) -> float:
    return ((1 + ea / 100) ** (1 / 12) - 1) * 100


def mv_a_ea(mv: float) -> float:
    return ((1 + mv / 100) ** 12 - 1) * 100


def tasa_ea_desde_input(valor, tipo: str) -> Optional[float]:
    try:
        raw = float(valor)
    except (TypeError, ValueError):
        return None
    if not raw or math.isnan(raw):
        return None
    return raw if tipo == "ea" else mv_a_ea(raw)


def proxima_fecha_inversion(dia_pago: int, hoy: datetime.date) -> datetime.date:
    nxt = sumar_meses(hoy, 0, dia_pago)
    return sumar_meses(hoy, 1, dia_pago) if nxt < hoy else nxt


def rendimiento_mensual_fija(monto: float, tasa_ea: float) -> int:
    return redondear_js(monto * ea_a_mv(tasa_ea) / 100)


def cambio_valor(nuevo: float, anterior: float, base: float) -> dict:
    total = nuevo - base
    return {"delta": nuevo - anterior, "total": total, "total_pct": porcentaje(total, base)}


def estimar_intereses_pagados(monto_inicial: float, saldo_actual: float, tasa_ea: float, cuota_mensual: float) -> Optional[int]:
    if not tasa_ea or not cuota_mensual or not monto_inicial or saldo_actual >= monto_inicial:
        return None
    tasa_mv = (1 + tasa_ea / 100) ** (1 / 12) - 1
    saldo = monto_inicial
    total = 0.0
    for _ in range(600):
        if saldo <= saldo_actual + 1:
            break
        interes = saldo * tasa_mv
        capital = cuota_mensual - interes
        if capital <= 0:
            break
        total += interes
        saldo -= capital
    return redondear_js(total)


def intereses_pagados(d: dict) -> Optional[dict]:
    if (d.get("total_intereses") or 0) > 0:
        return {"valor": d["total_intereses"], "exacto": True}
    est = estimar_intereses_pagados(d["monto_inicial"], d["saldo_actual"], d.get("tasa_ea") or 0, d["cuota_mensual"])
    return None if est is None else {"valor": est, "exacto": False}


def fmt_intereses(info: dict, texto_monto: str) -> str:
    return ("" if info["exacto"] else "~") + texto_monto


def desglose_pago(saldo_anterior: float, total: float, saldo_nuevo: float) -> dict:
    capital = max(0, saldo_anterior - saldo_nuevo)
    return {"capital": capital, "intereses": max(0, total - capital)}


def comision_adelanto(saldo_anterior: float, monto: float, saldo_nuevo: float) -> float:
    return max(0, saldo_nuevo - saldo_anterior - monto)
