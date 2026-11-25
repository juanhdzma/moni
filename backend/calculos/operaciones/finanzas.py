import datetime
from typing import Optional

from ..fechas import redondear_js, sumar_meses
from ..numeros import porcentaje


def ea_a_mv(ea: float) -> float:
    return ((1 + ea / 100) ** (1 / 12) - 1) * 100


def mv_a_ea(mv: float) -> float:
    return ((1 + mv / 100) ** 12 - 1) * 100


def convertir_tasa(valor: float, tipo: str) -> float:
    return mv_a_ea(valor) if tipo == "mv" and valor else valor


def proxima_fecha_inversion(dia_pago: int, hoy: datetime.date) -> datetime.date:
    nxt = sumar_meses(hoy, 0, dia_pago)
    return sumar_meses(hoy, 1, dia_pago) if nxt < hoy else nxt


def rendimiento_mensual_fija(monto: float, tasa_ea: float) -> int:
    return redondear_js(monto * ea_a_mv(tasa_ea) / 100)


def rendimiento_esperado(inv: dict) -> int | None:
    tasa = inv.get("tasa_ea")
    return rendimiento_mensual_fija(inv["valor_actual"], tasa) if tasa else None


def cambio_valor(nuevo: float, anterior: float, base: float) -> dict:
    total = nuevo - base
    return {"delta": nuevo - anterior, "total": total, "total_pct": porcentaje(total, base)}


def estimar_intereses_pagados(monto_inicial: float, saldo_actual: float, tasa_ea: float, cuota_mensual: float) -> Optional[int]:
    if not tasa_ea or not cuota_mensual or not monto_inicial or saldo_actual >= monto_inicial:
        return None
    tasa_mv = ea_a_mv(tasa_ea) / 100
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


def desglose_pago(saldo_anterior: float, total: float, saldo_nuevo: float) -> dict:
    capital = max(0, saldo_anterior - saldo_nuevo)
    return {"capital": capital, "intereses": max(0, total - capital)}


def comision_adelanto(saldo_anterior: float, monto: float, saldo_nuevo: float) -> float:
    return max(0, saldo_nuevo - saldo_anterior - monto)
