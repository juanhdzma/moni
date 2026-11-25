from backend.calculos.operaciones.sugerencias_pago import sugerencia_pago

HINT_CUOTA = "Pre-llenado con la cuota mensual — ajustá si aplica."
HINT_CUOTA_SIN_MONTO = "Ingresá el monto de la cuota."
HINT_ABONO = "Abono extraordinario: no mueve la fecha de la próxima cuota."
HINT_LIQUIDAR = "Ajustá si el banco cobra intereses adicionales al cancelar."


def test_sugerencia_con_cuota_menor_al_saldo():
    assert sugerencia_pago(1000, 300) == {
        "cuota": {"monto": 300, "nuevo_saldo": None, "hint": HINT_CUOTA},
        "abono": {"monto": None, "nuevo_saldo": None, "hint": HINT_ABONO},
        "liquidar": {"monto": 1000, "nuevo_saldo": 0, "hint": HINT_LIQUIDAR},
    }


def test_cuota_se_acota_al_saldo_y_redondea():
    assert sugerencia_pago(100, 300)["cuota"]["monto"] == 100
    assert sugerencia_pago(100.5, 300)["liquidar"]["monto"] == 101
    assert sugerencia_pago(1000, 99.5)["cuota"]["monto"] == 100


def test_sin_cuota_no_sugiere_monto():
    assert sugerencia_pago(1000, 0)["cuota"] == {"monto": None, "nuevo_saldo": None, "hint": HINT_CUOTA_SIN_MONTO}
    assert sugerencia_pago(0, 300)["cuota"] == {"monto": None, "nuevo_saldo": None, "hint": HINT_CUOTA_SIN_MONTO}
