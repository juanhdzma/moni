import datetime
import re

from ..base.fechas import mes_corto, mes_de, normalizar_fecha
from .flujos import flujo_inversiones, flujo_patrimonio


def _mes_atras(hoy: datetime.date, k: int) -> tuple[int, int]:
    idx = hoy.year * 12 + hoy.month - 1 - k
    return idx // 12, idx % 12 + 1


def clave_mes(hoy: datetime.date, k: int) -> str:
    y, m = _mes_atras(hoy, k)
    return f"{y:04d}-{m:02d}"


def serie_mensual(txs, count: int, flujo, hoy: datetime.date) -> list[float]:
    por_mes: dict[str, list] = {}
    for t in txs:
        por_mes.setdefault(mes_de(t["fecha"]), []).append(t)
    return [flujo(por_mes.get(clave_mes(hoy, count - 1 - i), [])) for i in range(count)]


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
    fijos = {"3M": 3, "6M": 6, "1Y": 12}
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
