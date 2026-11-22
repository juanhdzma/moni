import pytest

from backend.calculos import operaciones as op

from .helpers_operaciones import D, inversion


def test_ea_y_mv_son_inversas():
    assert op.mv_a_ea(op.ea_a_mv(12.5)) == pytest.approx(12.5, abs=1e-9)
    assert op.ea_a_mv(0) == 0


def test_convertir_tasa():
    assert op.convertir_tasa(12, "ea") == 12
    assert op.convertir_tasa(1, "mv") == pytest.approx(op.mv_a_ea(1))
    assert op.convertir_tasa(0, "mv") == 0
    assert op.convertir_tasa(None, "mv") is None


def test_proxima_fecha_inversion():
    h = D(2026, 8, 15)
    assert op.proxima_fecha_inversion(15, h) == h
    assert op.proxima_fecha_inversion(20, h) == D(2026, 8, 20)
    assert op.proxima_fecha_inversion(10, h) == D(2026, 9, 10)


def test_proxima_fecha_inversion_recorta_dia_31():
    assert op.proxima_fecha_inversion(31, D(2026, 2, 10)) == D(2026, 2, 28)
    assert op.proxima_fecha_inversion(31, D(2026, 4, 30)) == D(2026, 4, 30)
    assert op.proxima_fecha_inversion(30, D(2026, 1, 31)) == D(2026, 2, 28)


def test_derivar_inversion_proximo_pago():
    h = D(2026, 8, 15)
    assert op.derivar_inversion(inversion(dia_pago=15), h)["proximo_pago"]["texto"] == "hoy"
    assert op.derivar_inversion(inversion(dia_pago=20), h)["proximo_pago"]["texto"] == "en 5d"
    assert op.derivar_inversion(inversion(dia_pago=10), h)["proximo_pago"]["texto"] == "en 26d"
    assert op.derivar_inversion(inversion(dia_pago=None), h)["proximo_pago"] is None
    assert op.derivar_inversion(inversion(dia_pago=31), D(2026, 2, 28))["proximo_pago"]["texto"] == "hoy"
    assert op.derivar_inversion(inversion(dia_pago=31), D(2026, 4, 30))["proximo_pago"]["texto"] == "hoy"


def test_rendimiento_mensual_fija_redondea_a_pesos():
    assert op.rendimiento_mensual_fija(1_000_000, 12) == 9_489
    assert isinstance(op.rendimiento_mensual_fija(1_000_000, 12), int)


def test_cambio_valor():
    assert op.cambio_valor(1_100, 1_050, 1_000) == {"delta": 50, "total": 100, "total_pct": 10}
    assert op.cambio_valor(500, 600, 0) == {"delta": -100, "total": 500, "total_pct": 0}


def test_estimar_intereses_sin_datos_o_sin_pagos():
    assert op.estimar_intereses_pagados(1000, 1000, 20, 100) is None
    assert op.estimar_intereses_pagados(1000, 500, 0, 100) is None
    assert op.estimar_intereses_pagados(0, 0, 20, 100) is None


def test_estimar_intereses_amortiza_mes_a_mes():
    r = op.estimar_intereses_pagados(1_000_000, 500_000, 24, 100_000)
    assert isinstance(r, int) and r > 0


def test_estimar_intereses_corta_si_la_cuota_no_cubre_el_interes():
    assert op.estimar_intereses_pagados(1_000_000, 900_000, 60, 1_000) == 0


def test_intereses_pagados_exacto_o_estimado():
    base = {"monto_inicial": 1_000_000, "saldo_actual": 500_000, "tasa_ea": 24, "cuota_mensual": 100_000}
    assert op.intereses_pagados({**base, "total_intereses": 42_000}) == {"valor": 42_000, "exacto": True}
    est = op.intereses_pagados({**base, "total_intereses": 0})
    assert est["exacto"] is False
    assert op.intereses_pagados({**base, "saldo_actual": 1_000_000, "total_intereses": 0}) is None


def test_desglose_pago():
    assert op.desglose_pago(1_000_000, 150_000, 900_000) == {"capital": 100_000, "intereses": 50_000}
    assert op.desglose_pago(1_000_000, 50_000, 900_000) == {"capital": 100_000, "intereses": 0}
    assert op.desglose_pago(100, 50, 200) == {"capital": 0, "intereses": 50}


def test_comision_adelanto():
    assert op.comision_adelanto(1_000_000, 500_000, 1_520_000) == 20_000
    assert op.comision_adelanto(1_000_000, 500_000, 1_500_000) == 0
    assert op.comision_adelanto(1_000_000, 500_000, 1_400_000) == 0
