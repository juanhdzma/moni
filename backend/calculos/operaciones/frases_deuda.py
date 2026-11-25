import math
from typing import Optional

from ..base.formato import cop, porcentaje_texto
from .finanzas import intereses_pagados

SIMBOLO_POR_DEFECTO = "$"


def descripcion_pago(nombre: str, capital: float, intereses: float, simbolo: str = SIMBOLO_POR_DEFECTO) -> str:
    return f"Cuota · {nombre} (capital {cop(capital, simbolo)}, intereses {cop(intereses, simbolo)})"


def descripcion_adelanto(nombre: str) -> str:
    return f"Adelanto · {nombre}"


def descripcion_credito(nombre: str) -> str:
    return f"Crédito · {nombre}"


def _intereses_texto(intereses: Optional[dict], simbolo: str) -> Optional[str]:
    if intereses is None:
        return None
    return ("" if intereses["exacto"] else "~") + cop(intereses["valor"], simbolo)


def frases_deuda(deuda: dict, simbolo: str = SIMBOLO_POR_DEFECTO) -> dict:
    cupo = deuda.get("cupo") or 0
    cuota = deuda["cuota_mensual"]
    meses = math.ceil(deuda["saldo_actual"] / cuota) if cuota > 0 else None
    pagados = intereses_pagados(deuda)
    intereses = _intereses_texto(pagados, simbolo)
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
            if pagados and pagados["exacto"]
            else "Estimado por amortización — todavía no hay pagos registrados"
        ),
        "disponible_texto": cop(deuda["disponible"], simbolo) if deuda["tiene_cupo"] else None,
        "intereses_saldada_texto": f"{intereses} en intereses" if intereses else None,
        "saldada_badge": "Saldado",
        "capital_pagado_texto": "capital total pagado",
    }


def frases_resumen(resumen: dict, simbolo: str = SIMBOLO_POR_DEFECTO) -> dict:
    intereses = resumen["total_intereses"]
    return {
        "cuotas": cop(resumen["total_cuotas"], simbolo),
        "cuotas_sufijo": "/mes en cuotas",
        "intereses": ("~" if resumen["intereses_aproximado"] else "") + cop(intereses, simbolo) if intereses > 0 else None,
        "intereses_sufijo": "pagados en intereses",
    }


def texto_vacio_creditos(hay_terminadas: bool) -> dict:
    if hay_terminadas:
        return {"titulo": "Sin créditos activos", "texto": "¡Todos los créditos están saldados!"}
    return {"titulo": "Sin créditos", "texto": "Agregá uno con el botón + de arriba."}


TEXTO_VACIO_TARJETAS = {"titulo": "Sin tarjetas", "texto": "Agregá una para cargarle gastos y seguir su cupo."}


def con_frases(resumen: dict, simbolo: str = SIMBOLO_POR_DEFECTO) -> dict:
    def anotar(filas: list[dict]) -> list[dict]:
        return [
            {**d, "frases": frases_deuda(d, simbolo)}
            for d in filas
        ]

    publico = {k: v for k, v in resumen.items() if k not in ("intereses_aproximado", "total_cuotas", "total_intereses")}
    return {
        **publico,
        "texto_vacio_creditos": texto_vacio_creditos(bool(resumen["terminadas"])),
        "texto_vacio_tarjetas": TEXTO_VACIO_TARJETAS,
        "dato": frases_resumen(resumen, simbolo),
        "creditos": anotar(resumen["creditos"]),
        "tarjetas": anotar(resumen["tarjetas"]),
        "terminadas": anotar(resumen["terminadas"]),
    }
