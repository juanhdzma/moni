import datetime

from ..fechas import mes_de
from ..numeros import porcentaje
from .flujos import es_gasto_cartera, flujo_cartera, net_worth
from ..formato import cop, cop_corto, frase, plural, porcentaje_texto, tono_de_valor
from .gastos import PERIODOS_EVOLUCION_VISIBLES
from .series import (
    clave_mes,
    etiquetas_meses,
    fechas_inversiones,
    fechas_transacciones,
    meses_periodo,
    monthly_inv_delta,
    monthly_patrimonio,
    serie_hacia_atras,
    serie_mensual,
)

PERIODOS_EVOLUCION = PERIODOS_EVOLUCION_VISIBLES
MESES_ESTE_MES = 6
MESES_PROYECCION = 12


def frase_mes(ahorro_pct: float, ingresos: float) -> dict:
    if ingresos <= 0:
        return {"tipo": "sin_ingresos", **frase("Todavía no entró plata este mes.")}
    if ahorro_pct >= 0:
        porcentaje = (f"{porcentaje_texto(ahorro_pct)}%", "positivo")
        return {"tipo": "quedo", "pct": ahorro_pct, **frase("Te quedó el ", porcentaje, " de lo que entró.")}
    porcentaje = (f"{porcentaje_texto(-ahorro_pct)}%", "negativo")
    return {"tipo": "excedio", "pct": -ahorro_pct, **frase("Salió ", porcentaje, " más de lo que entró.")}


def _del_mes(txs, hoy: datetime.date) -> list:
    clave = clave_mes(hoy, 0)
    return [t for t in txs if mes_de(t["fecha"]) == clave]


def _ingresos_gastos(txs) -> tuple[float, float]:
    ingresos = sum(t["monto"] for t in txs if t["tipo"] == "ingreso")
    gastos = sum(t["monto"] for t in txs if es_gasto_cartera(t))
    return ingresos, gastos


def _balance_mes(txs, hoy: datetime.date) -> dict:
    mes = _del_mes(txs, hoy)
    ingresos, gastos = _ingresos_gastos(mes)
    quedo = flujo_cartera(mes)
    ahorro_pct = porcentaje(quedo, ingresos)
    return {
        "ingresos": ingresos,
        "gastos": gastos,
        "quedo": quedo,
        "ahorro_pct": ahorro_pct,
        "frase": frase_mes(ahorro_pct, ingresos),
    }


def resumen_dashboard(estado, hoy: datetime.date) -> dict:
    txs = estado["transacciones"]
    deudas = estado["deudas"]
    inversiones = estado["inversiones"]
    activos = estado["activos"]

    vigentes = [d for d in deudas if d["vigente"]]
    total_deuda = sum(d["saldo_actual"] for d in vigentes)
    total_inv = sum(i["valor_actual"] for i in inversiones)
    total_activos = sum(a["valor_actual"] for a in activos)
    ultimos12 = monthly_patrimonio(txs, 12, hoy)
    total_invertido = sum(i["monto_invertido"] for i in inversiones)
    ganancia = total_inv - total_invertido
    efectivo = flujo_cartera(txs)

    return {
        "patrimonio": net_worth(txs, inversiones, activos, deudas),
        "efectivo": efectivo,
        "total_deuda": total_deuda,
        "total_inv": total_inv,
        "total_activos": total_activos,
        "proy_delta": sum(ultimos12) / len(ultimos12) * MESES_PROYECCION,
        "texto_proyeccion": f"proyectados en {MESES_PROYECCION} meses",
        "cuota_total": sum(d["cuota_mensual"] for d in vigentes),
        "deudas_activas": len(vigentes),
        "total_invertido": total_invertido,
        "ganancia_inv": ganancia,
        "ganancia_inv_pct": porcentaje(ganancia, total_invertido),
        "total_barra": abs(total_activos) + abs(total_inv) + abs(efectivo) + abs(total_deuda),
    }


def _parte(id: str, nombre: str, valor: float, negativo: bool, detalle: str, tono: str) -> dict:
    firmado = -abs(valor) if negativo else abs(valor)
    return {
        "id": id,
        "nombre": nombre,
        "valor": valor,
        "valor_firmado": firmado,
        "negativo": negativo,
        "detalle": detalle,
        "tono": tono,
    }


def _detalle_ganancia(resumen: dict, simbolo: str) -> str:
    ganancia, ganancia_pct = resumen["ganancia_inv"], resumen["ganancia_inv_pct"]
    signo = "+" if ganancia >= 0 else ""
    signo_pct = "+" if ganancia_pct >= 0 else "−"
    return f"{signo}{cop_corto(ganancia, simbolo)} ({signo_pct}{porcentaje_texto(abs(ganancia_pct))}%)"


def partes_patrimonio(resumen: dict, conteos: dict, simbolo: str = "$") -> list[dict]:
    detalle_inversiones = (
        _detalle_ganancia(resumen, simbolo)
        if resumen["total_invertido"] > 0
        else plural(conteos["inversiones"], "posición", "posiciones")
    )
    detalle_deudas = f"{cop(resumen['cuota_total'], simbolo)}/mes · {plural(resumen['deudas_activas'], 'deuda', 'deudas')}"
    return [
        _parte("activos", "Activos", resumen["total_activos"], False, plural(conteos["activos"], "activo", "activos"), "activos"),
        _parte("inversiones", "Inversiones", resumen["total_inv"], False, detalle_inversiones, "inversiones"),
        _parte("balance", "Cartera", resumen["efectivo"], resumen["efectivo"] < 0, "Efectivo y cuentas", "deudas" if resumen["efectivo"] < 0 else "cartera"),
        _parte("deudas", "Deudas", resumen["total_deuda"], True, detalle_deudas, "deudas"),
    ]


def _frase_evolucion(verbo: str, sujeto: str, mes_desde: str, desde: float, hasta: float, simbolo: str) -> dict:
    cambio = hasta - desde
    partes = [verbo]
    if cambio != 0:
        signo = "+" if cambio > 0 else "−"
        tono = "negativo" if cambio < 0 else "positivo"
        partes += [" ", (f"{signo}{cop_corto(abs(cambio), simbolo)}", tono)]
    partes += [f"{sujeto} desde fin de {mes_desde}: de {cop_corto(desde, simbolo)} a ", (cop_corto(hasta, simbolo), "fuerte"), "."]
    return frase(*partes)


def evolucion(estado, serie: str, periodo: str, hoy: datetime.date, simbolo: str = "$") -> dict:
    txs = estado["transacciones"]
    inv = serie == "inversiones"
    fechas = fechas_transacciones(txs)
    if inv:
        fechas += fechas_inversiones(estado["inversiones"])
    count = meses_periodo(periodo, fechas, hoy)
    if inv:
        final = sum(i["valor_actual"] for i in estado["inversiones"])
        deltas = monthly_inv_delta(txs, count, hoy)
    else:
        final = net_worth(txs, estado["inversiones"], estado["activos"], estado["deudas"])
        deltas = monthly_patrimonio(txs, count, hoy)
    niveles = serie_hacia_atras(final, deltas)
    etiquetas = etiquetas_meses(count, hoy)
    puntos = [{"mes": etiquetas[i], "valor": niveles[i]} for i in range(count)]
    desde = puntos[0]["valor"]
    hasta = puntos[-1]["valor"]
    cambio = hasta - desde
    verbo = "Subiste" if cambio > 0 else "Bajaste" if cambio < 0 else "Te mantuviste"
    sujeto = " en inversiones" if inv else ""
    return {
        "serie": serie,
        "periodo": periodo,
        "meses": count,
        "puntos": puntos,
        "desde": desde,
        "cambio": cambio,
        "nombre_serie": serie.capitalize(),
        "tono": "inversiones" if inv else "cartera",
        "descripcion_grafico": f"Evolución mensual de {serie}",
        "frase": _frase_evolucion(verbo, sujeto, puntos[0]["mes"], desde, hasta, simbolo),
    }


def este_mes(estado, hoy: datetime.date) -> dict:
    txs = estado["transacciones"]
    mes = _balance_mes(txs, hoy)
    entro = serie_mensual(txs, MESES_ESTE_MES, lambda l: sum(t["monto"] for t in l if t["tipo"] == "ingreso"), hoy)
    salio = serie_mensual(txs, MESES_ESTE_MES, lambda l: sum(t["monto"] for t in l if es_gasto_cartera(t)), hoy)
    etiquetas = etiquetas_meses(MESES_ESTE_MES, hoy)
    return {
        "ingresos": mes["ingresos"],
        "gastos": mes["gastos"],
        "gastos_firmado": -mes["gastos"],
        "quedo": mes["quedo"],
        "tono_ingresos": tono_de_valor(mes["ingresos"]),
        "tono_gastos": "deudas",
        "tono_quedo": tono_de_valor(mes["quedo"]),
        "titulo_quedo": "Te quedó",
        "texto_tarjeta": "Lo pagado con tarjeta no sale de la cartera.",
        "frase": mes["frase"],
        "descripcion_grafico": f"Entró y salió por mes, últimos {MESES_ESTE_MES} meses",
        "meses": [{"mes": etiquetas[i], "entro": entro[i], "salio": salio[i]} for i in range(MESES_ESTE_MES)],
    }
