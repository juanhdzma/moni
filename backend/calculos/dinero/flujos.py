from ..constantes import CATEGORIAS_SISTEMA

_INGRESO = CATEGORIAS_SISTEMA["ingreso"]
_GASTO = CATEGORIAS_SISTEMA["gasto"]
CATEGORIAS_NEUTRAS_PATRIMONIO = {
    nombre for grupo in CATEGORIAS_SISTEMA.values() for nombre in grupo.values()
} - {_INGRESO["intereses"]}


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
        if t["categoria"] == _GASTO["inversion"]:
            total += t["monto"]
        elif t["categoria"] == _INGRESO["dividendos"]:
            total -= t["monto"]
    return total


def net_worth(txs, inversiones, activos, deudas) -> float:
    return (
        flujo_cartera(txs)
        + sum(i["valor_actual"] for i in inversiones)
        + sum(a["valor_actual"] for a in activos)
        - sum(d["saldo_actual"] for d in deudas)
    )
