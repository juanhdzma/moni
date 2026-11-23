def porcentaje(parte: float, base: float) -> float:
    return parte / base * 100 if base > 0 else 0


def pesos(v: float) -> float:
    return float(round(v))


def monto_firmado(tipo: str, monto: float) -> float:
    return monto if tipo == "ingreso" else -monto
