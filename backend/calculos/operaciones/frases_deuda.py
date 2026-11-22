from typing import Optional

from ..formato import cop, porcentaje_texto

SIMBOLO_POR_DEFECTO = "$"


def descripcion_pago(nombre: str, capital: float, intereses: float, simbolo: str = SIMBOLO_POR_DEFECTO) -> str:
    return f"Cuota · {nombre} (capital {cop(capital, simbolo)}, intereses {cop(intereses, simbolo)})"


def descripcion_adelanto(nombre: str) -> str:
    return f"Adelanto · {nombre}"


def saldo_tras_adelanto(cupo: float, disponible_nuevo: float) -> float:
    return cupo - disponible_nuevo


def _intereses_texto(deuda: dict, simbolo: str) -> Optional[str]:
    intereses = deuda["intereses_pagados"]
    if intereses is None:
        return None
    return ("" if intereses["exacto"] else "~") + cop(intereses["valor"], simbolo)


def frases_deuda(deuda: dict, simbolo: str = SIMBOLO_POR_DEFECTO) -> dict:
    cupo = deuda.get("cupo") or 0
    meses = deuda["meses_restantes"]
    intereses = _intereses_texto(deuda, simbolo)
    return {
        "detalle": (
            f"Cupo {cop(cupo, simbolo)}" if cupo > 0 else "Sin cupo definido"
        ) if deuda["es_tarjeta"] else (
            f"{porcentaje_texto(deuda['tasa_ea'])}% EA · {cop(deuda['cuota_mensual'], simbolo)}/mes"
            if deuda["activa"] else f"{porcentaje_texto(deuda['tasa_ea'])}% EA"
        ),
        "meses_restantes_texto": f"~{meses}m" if meses else None,
        "progreso_texto": f"{porcentaje_texto(deuda['progreso_pct'])}% pagado",
        "intereses_texto": intereses,
        "intereses_ayuda": (
            "Suma de los pagos registrados en Moni"
            if deuda["intereses_pagados"] and deuda["intereses_pagados"]["exacto"]
            else "Estimado por amortización — todavía no hay pagos registrados"
        ),
        "intereses_saldada_texto": f"{intereses} en intereses" if intereses else None,
    }


def frases_resumen(resumen: dict, simbolo: str = SIMBOLO_POR_DEFECTO) -> dict:
    intereses = resumen["total_intereses"]
    return {
        "cuotas": cop(resumen["total_cuotas"], simbolo),
        "cuotas_sufijo": "/mes en cuotas",
        "intereses": ("~" if resumen["intereses_aproximado"] else "") + cop(intereses, simbolo) if intereses > 0 else None,
        "intereses_sufijo": "pagados en intereses",
    }


def con_frases(resumen: dict, simbolo: str = SIMBOLO_POR_DEFECTO) -> dict:
    def anotar(filas: list[dict]) -> list[dict]:
        return [{**d, "frases": frases_deuda(d, simbolo)} for d in filas]

    return {
        **resumen,
        "dato": frases_resumen(resumen, simbolo),
        "creditos": anotar(resumen["creditos"]),
        "tarjetas": anotar(resumen["tarjetas"]),
        "terminadas": anotar(resumen["terminadas"]),
    }
