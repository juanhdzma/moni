from ..listados import top_segmentos
from ..numeros import porcentaje


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
        "ganancia_pct": porcentaje(actual - invertido, invertido),
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
        "variacion_pct": porcentaje(actual - inicial, inicial),
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
