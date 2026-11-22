import datetime
import math
from typing import Optional

from backend.calculos.fechas import (
    es_desactualizado,
    mes_corto,
    parse_fecha,
    redondear_js,
    sumar_meses,
    texto_dias,
    texto_dias_corto,
)
from backend.calculos.listados import SALDO_MINIMO, tiene_saldo, top_segmentos

PROX_OP_OVERDUE_DAYS = 10
PROX_OP_ADELANTE_DIAS = 45

FRECUENCIAS = {
    "semanal": {"label": "Semanal", "factor": 52 / 12, "dias": 7},
    "quincenal": {"label": "Quincenal", "factor": 2, "dias": 14},
    "mensual": {"label": "Mensual", "factor": 1, "meses": 1},
    "bimestral": {"label": "Bimestral", "factor": 1 / 2, "meses": 2},
    "trimestral": {"label": "Trimestral", "factor": 1 / 3, "meses": 3},
    "semestral": {"label": "Semestral", "factor": 1 / 6, "meses": 6},
    "anual": {"label": "Anual", "factor": 1 / 12, "meses": 12},
}


def frecuencia_label(frecuencia: str) -> str:
    info = FRECUENCIAS.get(frecuencia)
    return info["label"] if info else frecuencia


def to_mensual(monto: float, frecuencia: str) -> float:
    info = FRECUENCIAS.get(frecuencia)
    return monto * (info["factor"] if info else 1)


def proxima_fecha_recurrente(fecha_inicio: str, frecuencia: str, hoy: datetime.date) -> Optional[datetime.date]:
    start = parse_fecha(fecha_inicio)
    info = FRECUENCIAS.get(frecuencia)
    if not start or not info:
        return None
    dias = info.get("dias", 0)
    if dias:
        periodos = max(0, math.ceil((hoy - start).days / dias))
        return start + datetime.timedelta(days=periodos * dias)
    meses = info["meses"]
    k = max(0, math.ceil(((hoy.year - start.year) * 12 + hoy.month - start.month) / meses))
    nxt = sumar_meses(start, k * meses, start.day)
    while nxt < hoy:
        k += 1
        nxt = sumar_meses(start, k * meses, start.day)
    return nxt


proxima_fecha = proxima_fecha_recurrente


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
    return {"delta": nuevo - anterior, "total": total, "total_pct": total / base * 100 if base > 0 else 0}


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


def _nivel(valor: float, alto: float, medio: float) -> str:
    return "alto" if valor >= alto else "medio" if valor >= medio else "bajo"


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


def _proximo_pago(fecha: datetime.date, hoy: datetime.date) -> dict:
    dias = (fecha - hoy).days
    return {"fecha": fecha.isoformat(), "dias": dias, "texto": texto_dias_corto(dias)}


def derivar_inversion(fila: dict, hoy: datetime.date) -> dict:
    invertido = fila["monto_invertido"]
    ganancia = fila["valor_actual"] - invertido
    tasa = fila.get("tasa_ea")
    fija = fila["tipo"] == "fija"
    dia = fila.get("dia_pago")
    return {
        **fila,
        "ganancia": ganancia,
        "ganancia_pct": ganancia / invertido * 100 if invertido > 0 else 0,
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
        "cambio_pct": cambio / fila["valor_inicial"] * 100 if fila["valor_inicial"] > 0 else 0,
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


def clave_op(tipo: str, fuente_id: int, fecha_iso: str) -> str:
    return f"{tipo}:{fuente_id}:{fecha_iso}"


def _candidato(fecha: datetime.date, etiqueta: str, sub: str, monto: float, tipo: str, fuente_id: int) -> dict:
    iso = fecha.isoformat()
    return {
        "fecha": fecha,
        "fecha_iso": iso,
        "etiqueta": etiqueta,
        "sub": sub,
        "monto": monto,
        "tipo": tipo,
        "fuente_id": fuente_id,
        "clave": clave_op(tipo, fuente_id, iso),
    }


def calcular_proximas_operaciones(deudas: list, inversiones: list, recurrentes: list, hoy: datetime.date) -> list[dict]:
    pasado = hoy - datetime.timedelta(days=PROX_OP_OVERDUE_DAYS)
    limite = hoy + datetime.timedelta(days=PROX_OP_ADELANTE_DIAS)
    ops = []

    for d in deudas:
        if not (tiene_saldo(d) and d.get("proxima_cuota")):
            continue
        f = parse_fecha(d["proxima_cuota"])
        if f and pasado <= f <= limite:
            ops.append(_candidato(f, d["nombre"], "Cuota deuda", -d["cuota_mensual"], "deuda", d["id"]))

    for i in inversiones:
        if not (i["tipo"] == "fija" and i.get("pago") == "mensual" and i.get("dia_pago") and i.get("tasa_ea")):
            continue
        f = proxima_fecha_inversion(i["dia_pago"], hoy)
        if f <= limite:
            ops.append(
                _candidato(f, i["nombre"], "Rendimiento", rendimiento_mensual_fija(i["monto_invertido"], i["tasa_ea"]), "inversion", i["id"])
            )

    for r in recurrentes:
        if not (r["activo"] and r.get("fecha_inicio")):
            continue
        f = proxima_fecha_recurrente(r["fecha_inicio"], r["frecuencia"], hoy)
        if f and pasado <= f <= limite:
            monto = r["monto"] if r["tipo"] == "ingreso" else -r["monto"]
            ops.append(_candidato(f, r["nombre"], frecuencia_label(r["frecuencia"]), monto, "recurrente", r["id"]))

    return sorted(ops, key=lambda o: o["fecha"])


def armar_proximas(candidatas: list[dict], ocultas: set[str], hoy: datetime.date) -> dict:
    items = []
    for c in candidatas:
        if c["clave"] in ocultas:
            continue
        dias = (c["fecha"] - hoy).days
        items.append(
            {
                "clave": c["clave"],
                "tipo": c["tipo"],
                "fuente_id": c["fuente_id"],
                "fecha": c["fecha_iso"],
                "dia": c["fecha"].day,
                "mes_corto": mes_corto(c["fecha"].month),
                "etiqueta": c["etiqueta"],
                "sub": c["sub"],
                "monto": c["monto"],
                "dias": dias,
                "texto_dias": texto_dias(dias),
                "vencida": dias < 0,
            }
        )
    return {
        "hoy": hoy.isoformat(),
        "items": items,
        "vencidas": sum(1 for i in items if i["dias"] < 0),
        "salen_total": sum(-i["monto"] for i in items if i["monto"] < 0),
    }


def claves_vigentes(candidatas: list[dict]) -> set[str]:
    return {c["clave"] for c in candidatas}


def operaciones_proximas(
    deudas: list, inversiones: list, recurrentes: list, hoy: datetime.date, dias: int = 1
) -> list[tuple[datetime.date, str, float]]:
    limite = hoy + datetime.timedelta(days=dias)
    return [
        (c["fecha"], c["etiqueta"], c["monto"])
        for c in calcular_proximas_operaciones(deudas, inversiones, recurrentes, hoy)
        if hoy <= c["fecha"] <= limite
    ]


def _segmentos(filas: list, campo: str) -> list[dict]:
    return top_segmentos([{"key": str(f["id"]), "label": f["nombre"], "valor": f[campo]} for f in filas])


def resumen_deudas(filas: list[dict]) -> dict:
    vigentes = [d for d in filas if d["vigente"]]
    intereses = [d["intereses_pagados"] for d in filas if d["intereses_pagados"] is not None]
    return {
        "total": sum(d["saldo_actual"] for d in vigentes),
        "total_cuotas": sum(d["cuota_mensual"] for d in vigentes),
        "total_intereses": sum(i["valor"] for i in intereses),
        "intereses_aproximado": any(not i["exacto"] for i in intereses),
        "segmentos": _segmentos(vigentes, "saldo_actual"),
        "creditos": [d for d in vigentes if not d["es_tarjeta"]],
        "tarjetas": [d for d in vigentes if d["es_tarjeta"]],
        "terminadas": [d for d in filas if not d["es_tarjeta"] and not d["activa"]],
    }


def resumen_inversiones(filas: list[dict]) -> dict:
    invertido = sum(i["monto_invertido"] for i in filas)
    actual = sum(i["valor_actual"] for i in filas)
    return {
        "total_invertido": invertido,
        "total_actual": actual,
        "ganancia": actual - invertido,
        "ganancia_pct": (actual - invertido) / invertido * 100 if invertido > 0 else 0,
        "segmentos": _segmentos(filas, "valor_actual"),
        "fijas": [i for i in filas if i["tipo"] == "fija"],
        "variables": [i for i in filas if i["tipo"] == "variable"],
    }


def resumen_activos(filas: list[dict]) -> dict:
    inicial = sum(a["valor_inicial"] for a in filas)
    actual = sum(a["valor_actual"] for a in filas)
    return {
        "total_inicial": inicial,
        "total_actual": actual,
        "variacion": actual - inicial,
        "variacion_pct": (actual - inicial) / inicial * 100 if inicial > 0 else 0,
        "segmentos": _segmentos(filas, "valor_actual"),
        "items": filas,
    }


def preview_venta_activo(fila: dict, precio: float) -> dict:
    return {"vs_inicial": precio - fila["valor_inicial"], "vs_actual": precio - fila["valor_actual"]}


def resumen_recurrentes(filas: list[dict]) -> dict:
    activas = [r for r in filas if r["activo"]]
    ingresos = sum(r["mensual"] for r in activas if r["tipo"] == "ingreso")
    gastos_activos = [r for r in activas if r["tipo"] != "ingreso"]
    gastos = sum(r["mensual"] for r in gastos_activos)
    return {
        "total_gastos_mensual": gastos,
        "total_ingresos_mensual": ingresos,
        "neto_mensual": ingresos - gastos,
        "segmentos": _segmentos(gastos_activos, "mensual"),
        "ingresos": sorted((r for r in filas if r["tipo"] == "ingreso"), key=lambda r: r["mensual"], reverse=True),
        "gastos": sorted((r for r in filas if r["tipo"] != "ingreso"), key=lambda r: r["mensual"], reverse=True),
    }
