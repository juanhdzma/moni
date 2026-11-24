from ..formato import cop_corto, frase_flujo, porcentaje_texto, top_segmentos
from ..numeros import porcentaje
from .finanzas import intereses_pagados
from .textos import categoria_sugerida, texto_activos, texto_posiciones


def _segmentos(filas: list, campo: str) -> list[dict]:
    return top_segmentos([{"key": str(f["id"]), "label": f["nombre"], "valor": f[campo]} for f in filas])


def resumen_deudas(filas: list[dict]) -> dict:
    vigentes = [d for d in filas if d["vigente"]]
    intereses = [i for i in map(intereses_pagados, filas) if i is not None]
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


def _texto_ganancia(ganancia: float, ganancia_pct: float, simbolo: str) -> str:
    veredicto = "ganado" if ganancia >= 0 else "perdido"
    return f"{cop_corto(abs(ganancia), simbolo)} ({porcentaje_texto(abs(ganancia_pct))}%) {veredicto}"


def resumen_inversiones(filas: list[dict], simbolo: str = "$") -> dict:
    invertido = sum(i["monto_invertido"] for i in filas)
    actual = sum(i["valor_actual"] for i in filas)
    ganancia = actual - invertido
    ganancia_pct = porcentaje(ganancia, invertido)
    resumen = {
        "total_actual": actual,
        "ganancia": ganancia,
        "ganancia_pct": ganancia_pct,
        "mostrar_ganancia": invertido > 0,
        "texto_ganancia": _texto_ganancia(ganancia, ganancia_pct, simbolo),
        "segmentos": _segmentos(filas, "valor_actual"),
        "fijas": [i for i in filas if i["tipo"] == "fija"],
        "variables": [i for i in filas if i["tipo"] == "variable"],
    }
    return {**resumen, "texto_posiciones": texto_posiciones(resumen)}


def resumen_activos(filas: list[dict]) -> dict:
    inicial = sum(a["valor_inicial"] for a in filas)
    actual = sum(a["valor_actual"] for a in filas)
    resumen = {
        "total_inicial": inicial,
        "total_actual": actual,
        "variacion": actual - inicial,
        "mostrar_variacion": inicial > 0,
        "segmentos": _segmentos(filas, "valor_actual"),
        "items": filas,
    }
    return {**resumen, **texto_activos(resumen, len(filas))}


def preview_venta_activo(fila: dict, precio: float) -> dict:
    return {"vs_inicial": precio - fila["valor_inicial"], "vs_actual": precio - fila["valor_actual"]}


def con_categoria_sugerida(rec: dict, categorias: dict) -> dict:
    return {**rec, "categoria_sugerida": categoria_sugerida(rec, categorias)}


def _ordenadas(filas: list[dict], incluir, categorias: dict) -> list[dict]:
    elegidas = sorted((r for r in filas if incluir(r)), key=lambda r: r["mensual"], reverse=True)
    return [con_categoria_sugerida(r, categorias) for r in elegidas]


def resumen_recurrentes(filas: list[dict], categorias: dict, simbolo: str = "$") -> dict:
    activas = [r for r in filas if r["activo"]]
    ingresos = sum(r["mensual"] for r in activas if r["tipo"] == "ingreso")
    gastos_activos = [r for r in activas if r["tipo"] != "ingreso"]
    gastos = sum(r["mensual"] for r in gastos_activos)
    return {
        "neto_mensual": ingresos - gastos,
        "dato": frase_flujo("entran", "salen", ingresos, gastos, simbolo, " en fijos"),
        "segmentos": _segmentos(gastos_activos, "mensual"),
        "ingresos": _ordenadas(filas, lambda r: r["tipo"] == "ingreso", categorias),
        "gastos": _ordenadas(filas, lambda r: r["tipo"] != "ingreso", categorias),
    }
