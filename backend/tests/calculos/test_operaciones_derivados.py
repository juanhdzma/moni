import pytest

from backend.calculos import operaciones as op

from .helpers_operaciones import D, deuda, inversion


def test_derivar_deuda_y_tarjeta():
    d = op.derivar_deuda(deuda(saldo_actual=250, monto_inicial=1000, cuota_mensual=100))
    assert d["activa"] and d["vigente"] and d["progreso_pct"] == 75 and d["capital_pagado"] == 750
    assert "meses_restantes" not in d and d["nivel_progreso"] == "alto" and d["disponible"] is None
    t = op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=0, cupo=1000, cuota_mensual=0))
    assert t["vigente"] and not t["activa"] and t["disponible"] == 1000 and t["uso_pct"] == 0
    assert t["nivel_uso"] == "bajo"
    assert op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=950, cupo=1000))["nivel_uso"] == "alto"


def test_derivar_activo():
    a = op.derivar_activo({"valor_inicial": 1000, "valor_actual": 1100, "valor_actualizado_en": ""}, D(2026, 8, 1))
    assert a["cambio"] == 100 and a["cambio_pct"] == pytest.approx(10) and a["desactualizado"] is False


def test_derivar_inversion_ganancia():
    i = op.derivar_inversion(inversion(valor_actual=1_100_000, pago="vencimiento"), D(2026, 8, 1))
    assert i["ganancia"] == 100_000 and i["ganancia_pct"] == pytest.approx(10)
    assert i["proximo_pago"] is None and "tasa_mv" not in i
    assert i["rendimiento_esperado"] == op.rendimiento_mensual_fija(1_100_000, 12)
