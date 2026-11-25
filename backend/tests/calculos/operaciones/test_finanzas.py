import pytest

from backend.calculos import operaciones as op

from ..helpers_operaciones import D, inversion


def test_ea_y_mv_son_inversas():
    assert op.finanzas.mv_a_ea(op.finanzas.ea_a_mv(12.5)) == pytest.approx(12.5, abs=1e-9)
    assert op.finanzas.ea_a_mv(0) == 0


def test_convertir_tasa():
    assert op.finanzas.convertir_tasa(12, "ea") == 12
    assert op.finanzas.convertir_tasa(1, "mv") == pytest.approx(op.finanzas.mv_a_ea(1))
    assert op.finanzas.convertir_tasa(0, "mv") == 0
    assert op.finanzas.convertir_tasa(None, "mv") is None


def test_proxima_fecha_inversion():
    h = D(2026, 8, 15)
    assert op.finanzas.proxima_fecha_inversion(15, h) == h
    assert op.finanzas.proxima_fecha_inversion(20, h) == D(2026, 8, 20)
    assert op.finanzas.proxima_fecha_inversion(10, h) == D(2026, 9, 10)


def test_proxima_fecha_inversion_recorta_dia_31():
    assert op.finanzas.proxima_fecha_inversion(31, D(2026, 2, 10)) == D(2026, 2, 28)
    assert op.finanzas.proxima_fecha_inversion(31, D(2026, 4, 30)) == D(2026, 4, 30)
    assert op.finanzas.proxima_fecha_inversion(30, D(2026, 1, 31)) == D(2026, 2, 28)


def test_derivar_inversion_proximo_pago():
    h = D(2026, 8, 15)
    assert op.derivar_inversion(inversion(dia_pago=15), h)["proximo_pago"]["texto"] == "hoy"
    assert op.derivar_inversion(inversion(dia_pago=20), h)["proximo_pago"]["texto"] == "en 5d"
    assert op.derivar_inversion(inversion(dia_pago=10), h)["proximo_pago"]["texto"] == "en 26d"
    assert op.derivar_inversion(inversion(dia_pago=None), h)["proximo_pago"] is None
    assert op.derivar_inversion(inversion(dia_pago=31), D(2026, 2, 28))["proximo_pago"]["texto"] == "hoy"
    assert op.derivar_inversion(inversion(dia_pago=31), D(2026, 4, 30))["proximo_pago"]["texto"] == "hoy"


def test_rendimiento_mensual_fija_redondea_a_pesos():
    assert op.finanzas.rendimiento_mensual_fija(1_000_000, 12) == 9_489
    assert isinstance(op.finanzas.rendimiento_mensual_fija(1_000_000, 12), int)


def test_cambio_valor():
    assert op.cambio_valor(1_100, 1_050, 1_000) == {"delta": 50, "total": 100, "total_pct": 10}
    assert op.cambio_valor(500, 600, 0) == {"delta": -100, "total": 500, "total_pct": 0}


def test_estimar_intereses_sin_datos_o_sin_pagos():
    assert op.finanzas.estimar_intereses_pagados(1000, 1000, 20, 100) is None
    assert op.finanzas.estimar_intereses_pagados(1000, 500, 0, 100) is None
    assert op.finanzas.estimar_intereses_pagados(0, 0, 20, 100) is None


def test_estimar_intereses_amortiza_mes_a_mes():
    r = op.finanzas.estimar_intereses_pagados(1_000_000, 500_000, 24, 100_000)
    assert isinstance(r, int) and r > 0


def test_estimar_intereses_corta_si_la_cuota_no_cubre_el_interes():
    assert op.finanzas.estimar_intereses_pagados(1_000_000, 900_000, 60, 1_000) == 0


def test_intereses_pagados_exacto_o_estimado():
    base = {"monto_inicial": 1_000_000, "saldo_actual": 500_000, "tasa_ea": 24, "cuota_mensual": 100_000}
    assert op.finanzas.intereses_pagados({**base, "total_intereses": 42_000}) == {"valor": 42_000, "exacto": True}
    est = op.finanzas.intereses_pagados({**base, "total_intereses": 0})
    assert est["exacto"] is False
    assert op.finanzas.intereses_pagados({**base, "saldo_actual": 1_000_000, "total_intereses": 0}) is None


def test_desglose_pago():
    assert op.desglose_pago(1_000_000, 150_000, 900_000) == {"capital": 100_000, "intereses": 50_000}
    assert op.desglose_pago(1_000_000, 50_000, 900_000) == {"capital": 100_000, "intereses": 0}
    assert op.desglose_pago(100, 50, 200) == {"capital": 0, "intereses": 50}


def test_comision_adelanto():
    assert op.comision_adelanto(1_000_000, 500_000, 1_520_000) == 20_000
    assert op.comision_adelanto(1_000_000, 500_000, 1_500_000) == 0
    assert op.comision_adelanto(1_000_000, 500_000, 1_400_000) == 0


def test_equivalencia_tasa():
    assert op.tasas.equivalencia_tasa(0, "ea") == {"ea": None, "mv": None, "texto": None}
    ea = op.tasas.equivalencia_tasa(12, "ea")
    assert ea["ea"] == 12 and ea["texto"].startswith("Equivale a ") and ea["texto"].endswith("% MV")
    mv = op.tasas.equivalencia_tasa(1, "mv")
    assert mv["mv"] == 1 and mv["texto"].endswith("% EA")


def test_estimar_intereses_sin_cuota_con_monto_inicial_no_amortiza():
    assert op.finanzas.estimar_intereses_pagados(1_000_000, 500_000, 24, 0) is None
    assert op.finanzas.estimar_intereses_pagados(1_000_000, 500_000, 24, None) is None


def test_estimar_intereses_tope_de_600_meses():
    # 1M al 0,001% mensual aprox con cuota de $1: no termina nunca, corta en 600 iteraciones
    tasa_ea = 12.0
    total = op.finanzas.estimar_intereses_pagados(10_000_000_000, 1, tasa_ea, 100_000_000)
    tasa_mv = op.finanzas.ea_a_mv(tasa_ea) / 100
    saldo, esperado = 10_000_000_000.0, 0.0
    for _ in range(600):
        if saldo <= 2:
            break
        interes = saldo * tasa_mv
        esperado += interes
        saldo -= 100_000_000 - interes
    assert total == round(esperado)


def test_estimar_intereses_se_detiene_a_un_peso_del_saldo_actual():
    interes = 1000 * op.finanzas.ea_a_mv(12) / 100
    tras_primera_cuota = 1000 - (100 - interes)
    assert op.finanzas.estimar_intereses_pagados(1000, tras_primera_cuota - 0.5, 12, 100) == 9
    assert op.finanzas.estimar_intereses_pagados(1000, tras_primera_cuota - 1.5, 12, 100) == 18


def test_estimar_intereses_con_cuota_igual_al_interes_no_suma():
    tasa_mv = op.finanzas.ea_a_mv(12) / 100
    assert op.finanzas.estimar_intereses_pagados(1_000_000, 900_000, 12, 1_000_000 * tasa_mv) == 0


def test_rendimiento_esperado_solo_con_tasa():
    assert op.finanzas.rendimiento_esperado({"tasa_ea": 12, "valor_actual": 1_000_000}) == 9_489
    assert op.finanzas.rendimiento_esperado({"tasa_ea": 0, "valor_actual": 1_000_000}) is None
    assert op.finanzas.rendimiento_esperado({"valor_actual": 1_000_000}) is None


def test_intereses_pagados_ignora_total_cero_o_ausente():
    base = {"monto_inicial": 1_000_000, "saldo_actual": 500_000, "tasa_ea": 24, "cuota_mensual": 100_000}
    assert op.finanzas.intereses_pagados({**base, "total_intereses": 1}) == {"valor": 1, "exacto": True}
    assert op.finanzas.intereses_pagados(base)["exacto"] is False
    assert op.finanzas.intereses_pagados({**base, "tasa_ea": None}) is None


def test_estimar_intereses_tope_exacto_de_600_meses():
    tasa_mv = op.finanzas.ea_a_mv(12) / 100
    saldo, esperado = 1_000_000_000.0, 0.0
    for _ in range(600):
        interes = saldo * tasa_mv
        esperado += interes
        saldo -= 9_500_000 - interes
    assert saldo > 2
    assert op.finanzas.estimar_intereses_pagados(1_000_000_000, 1, 12, 9_500_000) == round(esperado)


def test_estimar_intereses_con_saldo_justo_un_peso_sobre_el_actual_se_detiene():
    tras_primera = 1000 - (100 - 1000 * op.finanzas.ea_a_mv(12) / 100)
    assert op.finanzas.estimar_intereses_pagados(1000, tras_primera - 1, 12, 100) == 9


def test_estimar_intereses_con_capital_menor_a_un_peso_igual_suma():
    interes = 1000 * op.finanzas.ea_a_mv(12) / 100
    assert op.finanzas.estimar_intereses_pagados(1000, 990, 12, interes + 0.5) > 9
