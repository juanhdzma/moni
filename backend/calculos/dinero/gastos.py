import datetime

from ..fechas import parse_fecha_hora, restar_meses
from ..formato import frase, porcentaje_texto

PERIODOS_GASTOS = ("1W", "1M", "3M", "6M", "1Y", "ALL")
NOMBRE_PERIODO_GASTOS = {
    "1W": "la última semana",
    "1M": "el último mes",
    "3M": "los últimos 3 meses",
    "6M": "los últimos 6 meses",
    "1Y": "el último año",
    "ALL": "todo el historial",
}
LABEL_PERIODO = {"1W": "1S", "1M": "1M", "3M": "3M", "6M": "6M", "1Y": "1A", "ALL": "Todo"}
PERIODOS_EVOLUCION_VISIBLES = ("3M", "6M", "1Y", "ALL")
MAX_DETALLE = 6


def opciones_periodo(periodos) -> list[dict]:
    return [{"value": p, "label": LABEL_PERIODO[p]} for p in periodos]


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


def _frase_top(top: dict, nombre_periodo: str) -> dict:
    return frase(
        (top["categoria"], "fuerte"),
        " se lleva el ",
        (f"{porcentaje_texto(top['pct'], 0)}%", "fuerte"),
        f" de lo que gastaste en {nombre_periodo}.",
    )


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
        "frase": top and _frase_top(top, NOMBRE_PERIODO_GASTOS[periodo]),
        "categorias": categorias,
    }


def movimientos_recientes(txs, n: int = 5) -> list[dict]:
    orden = sorted(txs, key=lambda t: t["fecha"], reverse=True)[:n]
    return [
        {k: t[k] for k in ("id", "fecha", "tipo", "categoria", "descripcion", "monto")}
        for t in orden
    ]
