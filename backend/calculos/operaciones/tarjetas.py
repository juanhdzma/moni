from ..errores import ErrorDeDominio
from ..numeros import pesos


def delta_saldo_tarjeta(tx: dict, deshacer: bool = False) -> float:
    if tx["tipo"] != "gasto" or tx["tarjeta_id"] is None:
        return 0
    return -tx["monto"] if deshacer else tx["monto"]


def saldo_tras_delta(tarjeta: dict, delta: float) -> float:
    if not tarjeta["es_tarjeta"]:
        raise ErrorDeDominio(f"La tarjeta {tarjeta['id']} no es válida")
    return pesos(tarjeta["saldo_actual"] + delta)
