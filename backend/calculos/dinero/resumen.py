import datetime

from ..fechas import mes_de
from ..constantes import tiene_saldo
from ..numeros import porcentaje
from .flujos import es_gasto_cartera, flujo_cartera, net_worth
from .gastos import PERIODOS_GASTOS
from .series import (
    _clave_mes,
    etiquetas_meses,
    fechas_inversiones,
    fechas_transacciones,
    meses_periodo,
    monthly_inv_delta,
    monthly_patrimonio,
    serie_hacia_atras,
    serie_mensual,
)

PERIODOS_EVOLUCION = PERIODOS_GASTOS[1:]


def frase_mes(ahorro_pct: float, ingresos: float) -> dict:
    if ingresos <= 0:
        return {"tipo": "sin_ingresos"}
    if ahorro_pct >= 0:
        return {"tipo": "quedo", "pct": ahorro_pct}
    return {"tipo": "excedio", "pct": -ahorro_pct}


def _del_mes(txs, hoy: datetime.date) -> list:
    clave = _clave_mes(hoy, 0)
    return [t for t in txs if mes_de(t["fecha"]) == clave]


def _ingresos_gastos(txs) -> tuple[float, float]:
    ingresos = sum(t["monto"] for t in txs if t["tipo"] == "ingreso")
    gastos = sum(t["monto"] for t in txs if es_gasto_cartera(t))
    return ingresos, gastos


def _balance_mes(txs, hoy: datetime.date) -> dict:
    mes = _del_mes(txs, hoy)
    ingresos, gastos = _ingresos_gastos(mes)
    ahorro_pct = porcentaje(flujo_cartera(mes), ingresos)
    return {
        "ingresos": ingresos,
        "gastos": gastos,
        "ahorro_pct": ahorro_pct,
        "frase": frase_mes(ahorro_pct, ingresos),
    }


def resumen_dashboard(estado, hoy: datetime.date) -> dict:
    txs = estado["transacciones"]
    deudas = estado["deudas"]
    inversiones = estado["inversiones"]
    activos = estado["activos"]
    mes = _balance_mes(txs, hoy)

    total_deuda = sum(d["saldo_actual"] for d in deudas)
    total_inv = sum(i["valor_actual"] for i in inversiones)
    total_activos = sum(a["valor_actual"] for a in activos)
    ultimos12 = monthly_patrimonio(txs, 12, hoy)
    activas = [d for d in deudas if tiene_saldo(d)]
    total_invertido = sum(i["monto_invertido"] for i in inversiones)
    ganancia = total_inv - total_invertido
    efectivo = flujo_cartera(txs)

    return {
        "patrimonio": net_worth(txs, inversiones, activos, deudas),
        "efectivo": efectivo,
        "total_deuda": total_deuda,
        "total_inv": total_inv,
        "total_activos": total_activos,
        "ingresos_mes": mes["ingresos"],
        "gastos_mes": mes["gastos"],
        "quedo_mes": mes["ingresos"] - mes["gastos"],
        "ahorro_pct": mes["ahorro_pct"],
        "proy_delta": sum(ultimos12) / len(ultimos12) * 12,
        "cuota_total": sum(d["cuota_mensual"] for d in activas),
        "deudas_activas": len(activas),
        "total_invertido": total_invertido,
        "ganancia_inv": ganancia,
        "ganancia_inv_pct": porcentaje(ganancia, total_invertido),
        "total_barra": abs(total_activos) + abs(total_inv) + abs(efectivo) + abs(total_deuda),
        "frase_mes": mes["frase"],
    }


def _plural(n: int, singular: str, plural: str) -> str:
    return f"{n} {singular if n == 1 else plural}"


def partes_patrimonio(resumen: dict, conteos: dict) -> list[dict]:
    inversiones = {
        "id": "inversiones",
        "nombre": "Inversiones",
        "valor": resumen["total_inv"],
        "negativo": False,
    }
    if resumen["total_invertido"] > 0:
        inversiones["detalle"] = None
        inversiones["detalle_tipo"] = "ganancia"
        inversiones["detalle_datos"] = {
            "ganancia": resumen["ganancia_inv"],
            "ganancia_pct": resumen["ganancia_inv_pct"],
        }
    else:
        inversiones["detalle"] = _plural(conteos["inversiones"], "posición", "posiciones")
    return [
        {
            "id": "activos",
            "nombre": "Activos",
            "valor": resumen["total_activos"],
            "negativo": False,
            "detalle": _plural(conteos["activos"], "activo", "activos"),
        },
        inversiones,
        {
            "id": "balance",
            "nombre": "Cartera",
            "valor": resumen["efectivo"],
            "negativo": resumen["efectivo"] < 0,
            "detalle": "Efectivo y cuentas",
        },
        {
            "id": "deudas",
            "nombre": "Deudas",
            "valor": resumen["total_deuda"],
            "negativo": True,
            "detalle": None,
            "detalle_datos": {
                "cuota_total": resumen["cuota_total"],
                "n": _plural(resumen["deudas_activas"], "deuda", "deudas"),
            },
        },
    ]


def evolucion(estado, serie: str, periodo: str, hoy: datetime.date) -> dict:
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
    return {
        "serie": serie,
        "periodo": periodo,
        "meses": count,
        "puntos": puntos,
        "desde": desde,
        "hasta": hasta,
        "cambio": cambio,
        "verbo": "Subiste" if cambio > 0 else "Bajaste" if cambio < 0 else "Te mantuviste",
        "sujeto": " en inversiones" if inv else "",
        "mes_desde": puntos[0]["mes"],
    }


def este_mes(estado, hoy: datetime.date) -> dict:
    txs = estado["transacciones"]
    mes = _balance_mes(txs, hoy)
    entro = serie_mensual(txs, 6, lambda l: sum(t["monto"] for t in l if t["tipo"] == "ingreso"), hoy)
    salio = serie_mensual(txs, 6, lambda l: sum(t["monto"] for t in l if es_gasto_cartera(t)), hoy)
    etiquetas = etiquetas_meses(6, hoy)
    return {
        "ingresos": mes["ingresos"],
        "gastos": mes["gastos"],
        "quedo": mes["ingresos"] - mes["gastos"],
        "ahorro_pct": mes["ahorro_pct"],
        "frase": mes["frase"],
        "meses": [{"mes": etiquetas[i], "entro": entro[i], "salio": salio[i]} for i in range(6)],
    }
