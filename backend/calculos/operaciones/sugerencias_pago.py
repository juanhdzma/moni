from ..base.numeros import pesos
from ..catalogo.constantes import MODOS_PAGO, MODOS_SOLO_PRESTAMO, valores

HINT_CUOTA = "Pre-llenado con la cuota mensual — ajustá si aplica."
HINT_CUOTA_SIN_MONTO = "Ingresá el monto de la cuota."
HINT_ABONO = "Abono extraordinario: no mueve la fecha de la próxima cuota."
HINT_LIQUIDAR = "Ajustá si el banco cobra intereses adicionales al cancelar."


def modos_disponibles(es_tarjeta: bool) -> list[str]:
    return [m for m in valores(MODOS_PAGO) if not (es_tarjeta and m in MODOS_SOLO_PRESTAMO)]


def sugerencia_pago(saldo_actual: float, cuota_mensual: float) -> dict:
    cuota = pesos(min(cuota_mensual, saldo_actual))
    return {
        "cuota": {"monto": cuota or None, "nuevo_saldo": None, "hint": HINT_CUOTA if cuota else HINT_CUOTA_SIN_MONTO},
        "abono": {"monto": None, "nuevo_saldo": None, "hint": HINT_ABONO},
        "liquidar": {"monto": pesos(saldo_actual), "nuevo_saldo": 0, "hint": HINT_LIQUIDAR},
    }
