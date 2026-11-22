import datetime
import re

from .fechas import mes_corto, mes_de, normalizar_fecha, parse_fecha_hora, restar_meses
from .listados import tiene_saldo

CATEGORIAS_NEUTRAS_PATRIMONIO = {
    "Pago deuda",
    "Inversión",
    "Compra activos",
    "Crédito recibido",
    "Avance de tarjeta",
    "Venta activos",
    "Dividendos",
}

PERIODOS_EVOLUCION = ("1M", "3M", "6M", "1Y", "ALL")
PERIODOS_GASTOS = ("1W", "1M", "3M", "6M", "1Y", "ALL")
NOMBRE_PERIODO_GASTOS = {
    "1W": "la última semana",
    "1M": "el último mes",
    "3M": "los últimos 3 meses",
    "6M": "los últimos 6 meses",
    "1Y": "el último año",
    "ALL": "todo el historial",
}
MAX_DETALLE = 6


def es_gasto_cartera(tx) -> bool:
    return tx["tipo"] == "gasto" and not tx["tarjeta_id"]


def flujo_cartera(txs) -> float:
    total = 0
    for t in txs:
        if t["tipo"] == "ingreso":
            total += t["monto"]
        elif es_gasto_cartera(t) or t["tipo"] == "transfer":
            total -= t["monto"]
    return total


def flujo_patrimonio(txs) -> float:
    total = 0
    for t in txs:
        if t["categoria"] in CATEGORIAS_NEUTRAS_PATRIMONIO:
            continue
        if t["tipo"] == "ingreso":
            total += t["monto"]
        elif t["tipo"] == "gasto":
            total -= t["monto"]
    return total


def flujo_inversiones(txs) -> float:
    total = 0
    for t in txs:
        if t["categoria"] == "Inversión":
            total += t["monto"]
        elif t["categoria"] == "Dividendos":
            total -= t["monto"]
    return total


def net_worth(txs, inversiones, activos, deudas) -> float:
    return (
        flujo_cartera(txs)
        + sum(i["valor_actual"] for i in inversiones)
        + sum(a["valor_actual"] for a in activos)
        - sum(d["saldo_actual"] for d in deudas)
    )


def _mes_atras(hoy: datetime.date, k: int) -> tuple[int, int]:
    idx = hoy.year * 12 + hoy.month - 1 - k
    return idx // 12, idx % 12 + 1


def _clave_mes(hoy: datetime.date, k: int) -> str:
    y, m = _mes_atras(hoy, k)
    return f"{y:04d}-{m:02d}"


def serie_mensual(txs, count: int, flujo, hoy: datetime.date) -> list[float]:
    por_mes: dict[str, list] = {}
    for t in txs:
        por_mes.setdefault(mes_de(t["fecha"]), []).append(t)
    return [flujo(por_mes.get(_clave_mes(hoy, count - 1 - i), [])) for i in range(count)]


def monthly_patrimonio(txs, count: int, hoy: datetime.date) -> list[float]:
    return serie_mensual(txs, count, flujo_patrimonio, hoy)


def monthly_inv_delta(txs, count: int, hoy: datetime.date) -> list[float]:
    return serie_mensual(txs, count, flujo_inversiones, hoy)


def serie_hacia_atras(final: float, deltas: list[float]) -> list[float]:
    data = [0.0] * len(deltas)
    if not data:
        return data
    data[-1] = final
    for i in range(len(deltas) - 2, -1, -1):
        data[i] = data[i + 1] - deltas[i + 1]
    return data


def etiquetas_meses(count: int, hoy: datetime.date) -> list[str]:
    return [mes_corto(_mes_atras(hoy, count - 1 - i)[1]) for i in range(count)]


def fechas_transacciones(txs) -> list[str]:
    return [normalizar_fecha(t["fecha"])[:10] for t in txs]


def fechas_inversiones(inversiones) -> list[str | None]:
    return [normalizar_fecha(i["fecha_inicio"])[:10] if i["fecha_inicio"] else None for i in inversiones]


def meses_periodo(periodo: str, fechas, hoy: datetime.date) -> int:
    fijos = {"1M": 2, "3M": 3, "6M": 6, "1Y": 12}
    if periodo in fijos:
        return fijos[periodo]
    validas = sorted(f for f in fechas if f)
    if not validas:
        return 6
    m = re.match(r"^(\d{4})-(\d{2})", validas[0])
    if not m:
        return 6
    meses = (hoy.year - int(m.group(1))) * 12 + (hoy.month - int(m.group(2))) + 1
    return max(meses, 2)


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


def resumen_dashboard(estado, hoy: datetime.date) -> dict:
    txs = estado["transacciones"]
    deudas = estado["deudas"]
    inversiones = estado["inversiones"]
    activos = estado["activos"]
    mes = _del_mes(txs, hoy)
    ingresos, gastos = _ingresos_gastos(mes)

    total_deuda = sum(d["saldo_actual"] for d in deudas)
    total_inv = sum(i["valor_actual"] for i in inversiones)
    total_activos = sum(a["valor_actual"] for a in activos)
    ultimos12 = monthly_patrimonio(txs, 12, hoy)
    activas = [d for d in deudas if tiene_saldo(d)]
    total_invertido = sum(i["monto_invertido"] for i in inversiones)
    ganancia = total_inv - total_invertido
    efectivo = flujo_cartera(txs)
    ahorro_pct = flujo_cartera(mes) / ingresos * 100 if ingresos > 0 else 0

    return {
        "patrimonio": net_worth(txs, inversiones, activos, deudas),
        "efectivo": efectivo,
        "total_deuda": total_deuda,
        "total_inv": total_inv,
        "total_activos": total_activos,
        "ingresos_mes": ingresos,
        "gastos_mes": gastos,
        "quedo_mes": ingresos - gastos,
        "ahorro_pct": ahorro_pct,
        "proy_delta": sum(ultimos12) / len(ultimos12) * 12,
        "cuota_total": sum(d["cuota_mensual"] for d in activas),
        "deudas_activas": len(activas),
        "total_invertido": total_invertido,
        "ganancia_inv": ganancia,
        "ganancia_inv_pct": ganancia / total_invertido * 100 if total_invertido > 0 else 0,
        "total_barra": abs(total_activos) + abs(total_inv) + abs(efectivo) + abs(total_deuda),
        "frase_mes": frase_mes(ahorro_pct, ingresos),
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
    ingresos, gastos = _ingresos_gastos(_del_mes(txs, hoy))
    ahorro_pct = flujo_cartera(_del_mes(txs, hoy)) / ingresos * 100 if ingresos > 0 else 0
    entro = serie_mensual(txs, 6, lambda l: sum(t["monto"] for t in l if t["tipo"] == "ingreso"), hoy)
    salio = serie_mensual(txs, 6, lambda l: sum(t["monto"] for t in l if es_gasto_cartera(t)), hoy)
    etiquetas = etiquetas_meses(6, hoy)
    return {
        "ingresos": ingresos,
        "gastos": gastos,
        "quedo": ingresos - gastos,
        "ahorro_pct": ahorro_pct,
        "frase": frase_mes(ahorro_pct, ingresos),
        "meses": [{"mes": etiquetas[i], "entro": entro[i], "salio": salio[i]} for i in range(6)],
    }


def gastos_en_periodo(txs, periodo: str, hoy: datetime.date) -> list[dict]:
    gastos = [t for t in txs if t["tipo"] == "gasto"]
    ahora = datetime.datetime.combine(hoy, datetime.time(23, 59, 59, 999000))
    meses = {"1M": 1, "3M": 3, "6M": 6, "1Y": 12}
    if periodo == "1W":
        desde = ahora - datetime.timedelta(days=7)
    elif periodo in meses:
        desde = restar_meses(ahora, meses[periodo])
    else:
        return gastos
    desde = desde.replace(hour=0, minute=0, second=0, microsecond=0)
    resultado = []
    for t in gastos:
        d = parse_fecha_hora(t["fecha"])
        if d is not None and d >= desde:
            resultado.append(t)
    return resultado


def agrupar_gastos(txs) -> list[dict]:
    grupos: dict[str, list] = {}
    for t in txs:
        grupos.setdefault(t["categoria"] or "Otros", []).append(t)
    filas = []
    for categoria, lista in grupos.items():
        recientes = sorted(lista, key=lambda t: t["fecha"], reverse=True)[:MAX_DETALLE]
        filas.append(
            {
                "categoria": categoria,
                "valor": sum(t["monto"] for t in lista),
                "n": len(lista),
                "detalle": [
                    {
                        "id": t["id"],
                        "fecha": t["fecha"],
                        "descripcion": t["descripcion"],
                        "categoria": categoria,
                        "monto": t["monto"],
                    }
                    for t in recientes
                ],
                "restantes": max(0, len(lista) - MAX_DETALLE),
            }
        )
    return sorted(filas, key=lambda f: f["valor"], reverse=True)


def gastos_periodo(txs, periodo: str, hoy: datetime.date) -> dict:
    categorias = agrupar_gastos(gastos_en_periodo(txs, periodo, hoy))
    total = sum(c["valor"] for c in categorias)
    top = None
    if categorias:
        c = categorias[0]
        top = {"categoria": c["categoria"], "valor": c["valor"], "pct": c["valor"] / total * 100 if total else 0}
    return {
        "periodo": periodo,
        "nombre_periodo": NOMBRE_PERIODO_GASTOS[periodo],
        "total": total,
        "max": max((c["valor"] for c in categorias), default=0),
        "top": top,
        "categorias": categorias,
    }


def movimientos_recientes(txs, n: int = 5) -> list[dict]:
    orden = sorted(txs, key=lambda t: t["fecha"], reverse=True)[:n]
    return [
        {k: t[k] for k in ("id", "fecha", "tipo", "categoria", "descripcion", "monto")}
        for t in orden
    ]
