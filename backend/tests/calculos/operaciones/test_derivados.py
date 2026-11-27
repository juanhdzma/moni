import pytest

from backend.calculos import operaciones as op

from ..helpers_operaciones import D, deuda, inversion, recurrente


def test_derivar_deuda_y_tarjeta():
    d = op.derivar_deuda(deuda(saldo_actual=250, monto_inicial=1000, cuota_mensual=100))
    assert d["activa"] and d["vigente"] and d["progreso_pct"] == 75 and d["capital_pagado"] == 750
    assert "meses_restantes" not in d and d["nivel_progreso"] == "alto" and d["disponible"] is None
    t = op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=0, cupo=1000, cuota_mensual=0))
    assert t["vigente"] and not t["activa"] and t["disponible"] == 1000 and t["uso_pct"] == 0
    assert t["nivel_uso"] == "bajo"
    assert op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=950, cupo=1000))["nivel_uso"] == "alto"


def test_derivar_inversion_ganancia():
    i = op.derivar_inversion(inversion(valor_actual=1_100_000, pago="vencimiento"), D(2026, 8, 1))
    assert i["ganancia"] == 100_000 and i["ganancia_pct"] == pytest.approx(10)
    assert i["proximo_pago"] is None and "tasa_mv" not in i
    assert i["rendimiento_esperado"] == op.finanzas.rendimiento_mensual_fija(1_100_000, 12)


def test_deuda_trae_tono_de_nivel():
    d = op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=950, cupo=1000))
    assert (d["nivel_uso"], d["tono_uso"]) == ("alto", "negativo")
    assert op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=0, cupo=1000))["tono_uso"] == "positivo"
    assert op.derivar_deuda(deuda(saldo_actual=250))["tono_progreso"] == "positivo"


HOY = D(2026, 8, 15)
HINT_ABONO = "Abono extraordinario: no mueve la fecha de la próxima cuota."


def test_derivar_deuda_objeto_completo():
    assert op.derivar_deuda(deuda(saldo_actual=250, monto_inicial=1000, cuota_mensual=100)) == {
        "id": 1, "nombre": "Deuda", "saldo_actual": 250, "cuota_mensual": 100, "proxima_cuota": "", "monto_inicial": 1000,
        "total_intereses": 0, "tasa_ea": 0, "es_tarjeta": False, "clase_deuda": "prestamo", "activa": True, "vigente": True,
        "progreso_pct": 75.0, "capital_pagado": 750, "nivel_progreso": "alto", "tono_progreso": "positivo",
        "tiene_cupo": False, "disponible": None, "uso_pct": 0, "nivel_uso": "bajo", "tono_uso": "positivo",
        "modos_disponibles": ["cuota", "abono", "liquidar"],
        "icono_url": "/assets/franquicias/otra.svg",
        "pago": {
            "cuota": {"monto": 100.0, "nuevo_saldo": None, "hint": "Pre-llenado con la cuota mensual — ajustá si aplica."},
            "abono": {"monto": None, "nuevo_saldo": None, "hint": HINT_ABONO},
            "liquidar": {"monto": 250.0, "nuevo_saldo": 0, "hint": "Ajustá si el banco cobra intereses adicionales al cancelar."},
        },
    }


@pytest.mark.parametrize("saldo,nivel,tono", [
    (1000, "bajo", "negativo"), (601, "bajo", "negativo"), (600, "medio", "alerta"), (251, "medio", "alerta"),
    (250, "alto", "positivo"), (0, "alto", "positivo"),
])
def test_nivel_y_tono_de_progreso_en_los_bordes_40_y_75(saldo, nivel, tono):
    d = op.derivar_deuda(deuda(saldo_actual=saldo, monto_inicial=1000))
    assert (d["nivel_progreso"], d["tono_progreso"]) == (nivel, tono)


@pytest.mark.parametrize("saldo,nivel,tono", [
    (0, "bajo", "positivo"), (599, "bajo", "positivo"), (600, "medio", "alerta"), (899, "medio", "alerta"),
    (900, "alto", "negativo"), (1000, "alto", "negativo"),
])
def test_nivel_y_tono_de_uso_en_los_bordes_60_y_90(saldo, nivel, tono):
    d = op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=saldo, cupo=1000))
    assert (d["nivel_uso"], d["tono_uso"]) == (nivel, tono)


def test_uso_y_progreso_se_acotan_a_100_y_disponible_a_0():
    t = op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=1500, cupo=1000))
    assert (t["uso_pct"], t["disponible"], t["tiene_cupo"]) == (100, 0, True)
    assert op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=1000, cupo=1000))["uso_pct"] == 100
    assert op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=500, cupo=1000))["uso_pct"] == 50
    assert op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=250, cupo=1000))["uso_pct"] == 25
    p = op.derivar_deuda(deuda(saldo_actual=-50, monto_inicial=1000))
    assert p["progreso_pct"] == 100 and p["capital_pagado"] == 1050
    p = op.derivar_deuda(deuda(saldo_actual=1500, monto_inicial=1000))
    assert p["progreso_pct"] == 0 and p["capital_pagado"] == -500


def test_deuda_sin_cupo_ni_monto_inicial_tiene_ceros():
    d = op.derivar_deuda(deuda(saldo_actual=100, monto_inicial=0, cupo=0))
    assert (d["progreso_pct"], d["uso_pct"], d["tiene_cupo"], d["disponible"]) == (0, 0, False, None)
    d = op.derivar_deuda(deuda(saldo_actual=100, monto_inicial=1, cupo=1))
    assert (d["tiene_cupo"], d["disponible"], d["uso_pct"], d["progreso_pct"]) == (True, 0, 100, 0)
    d = op.derivar_deuda(deuda(saldo_actual=0, monto_inicial=1, cupo=None))
    assert d["tiene_cupo"] is False and d["progreso_pct"] == 100


def test_deuda_clase_y_vigencia():
    d = op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=0))
    assert (d["clase_deuda"], d["es_tarjeta"], d["vigente"], d["activa"]) == ("tarjeta", True, True, False)
    d = op.derivar_deuda(deuda(es_tarjeta=0, saldo_actual=0))
    assert (d["clase_deuda"], d["es_tarjeta"], d["vigente"], d["activa"]) == ("prestamo", False, False, False)
    assert op.derivar_deuda(deuda(es_tarjeta=0, saldo_actual=0.5))["vigente"] is False
    assert op.derivar_deuda(deuda(es_tarjeta=0, saldo_actual=1))["vigente"] is True
    assert op.derivar_deuda(deuda())["clase_deuda"] == "prestamo"


def test_derivar_deuda_trae_la_sugerencia_de_pago_con_su_saldo_y_cuota():
    assert op.derivar_deuda(deuda(saldo_actual=80, cuota_mensual=100))["pago"]["cuota"]["monto"] == 80
    assert op.derivar_deuda(deuda(saldo_actual=500, cuota_mensual=0))["pago"]["cuota"]["monto"] is None


def test_derivar_inversion_fija_objeto_completo():
    assert op.derivar_inversion(inversion(), HOY) == {
        "id": 1, "nombre": "Inv", "tipo": "fija", "pago": "mensual", "dia_pago": 20, "tasa_ea": 12,
        "monto_invertido": 1_000_000, "valor_actual": 1_000_000, "capitaliza_default": False, "ganancia": 0,
        "ganancia_pct": 0.0, "texto_tasa": "12,00% EA · 0,9489% MV", "proximo_pago": {"fecha": "2026-08-20", "texto": "en 5d"},
        "rendimiento_esperado": 9489, "desactualizado": False, "monto_retiro_total": 1_000_000,
        "ganancia_tono": "neutro", "ganancia_signo": "", "accion_principal": "rendimiento",
    }


def test_derivar_inversion_variable_sin_tasa_ni_proximo_pago():
    v = op.derivar_inversion(inversion(tipo="variable", valor_actual=1_200_000, pago="vencimiento", dia_pago=None,
                                       tasa_ea=None, valor_actualizado_en="2026-06-01"), HOY)
    assert v["capitaliza_default"] is True and v["ganancia"] == 200_000 and v["ganancia_pct"] == 20
    assert v["texto_tasa"] is None and v["proximo_pago"] is None and v["rendimiento_esperado"] is None
    assert v["desactualizado"] is True and v["accion_principal"] == "valor"


def test_texto_tasa_solo_en_fijas_con_tasa():
    assert op.derivar_inversion(inversion(tipo="variable", tasa_ea=12), HOY)["texto_tasa"] is None
    assert op.derivar_inversion(inversion(tasa_ea=0), HOY)["texto_tasa"] is None
    assert op.derivar_inversion(inversion(tasa_ea=12.5), HOY)["texto_tasa"] == "12,50% EA · 0,9864% MV"


def test_inversion_desactualizada_solo_si_es_variable_y_vieja():
    viejo, nuevo = "2026-06-01", "2026-08-10"
    assert op.derivar_inversion(inversion(tipo="fija", valor_actualizado_en=viejo), HOY)["desactualizado"] is False
    assert op.derivar_inversion(inversion(tipo="variable", valor_actualizado_en=viejo), HOY)["desactualizado"] is True
    assert op.derivar_inversion(inversion(tipo="variable", valor_actualizado_en=nuevo), HOY)["desactualizado"] is False
    assert op.derivar_inversion(inversion(tipo="variable"), HOY)["desactualizado"] is False
    assert op.derivar_inversion(inversion(tipo="variable", valor_actualizado_en="2026-07-16"), HOY)["desactualizado"] is True
    assert op.derivar_inversion(inversion(tipo="variable", valor_actualizado_en="2026-07-17"), HOY)["desactualizado"] is False


def test_proximo_pago_solo_con_pago_mensual_y_dia():
    assert op.derivar_inversion(inversion(pago="vencimiento"), HOY)["proximo_pago"] is None
    assert op.derivar_inversion(inversion(pago="mensual", dia_pago=0), HOY)["proximo_pago"] is None


def test_derivar_activo():
    a = op.derivar_activo({"valor_inicial": 1000, "valor_actual": 1100, "valor_actualizado_en": ""}, D(2026, 8, 1))
    assert a["cambio"] == 100 and a["cambio_pct"] == pytest.approx(10) and a["desactualizado"] is False
    base = {"valor_actual": 1200, "valor_inicial": 1000}
    assert op.derivar_activo({**base, "valor_actualizado_en": "2026-06-01"}, HOY) == {
        **base, "valor_actualizado_en": "2026-06-01", "cambio": 200, "cambio_pct": 20.0, "desactualizado": True,
        "cambio_tono": "positivo", "cambio_signo": "+",
    }
    assert op.derivar_activo({**base, "valor_actualizado_en": "2026-08-01"}, HOY)["desactualizado"] is False
    assert op.derivar_activo(base, HOY)["desactualizado"] is False
    assert op.derivar_activo({"valor_actual": 400, "valor_inicial": 0}, HOY)["cambio_pct"] == 0
    assert op.derivar_activo({"valor_actual": 400, "valor_inicial": 500}, HOY)["cambio"] == -100


def test_derivar_recurrente_mensualiza_segun_la_frecuencia():
    assert op.derivar_recurrente(recurrente(monto=1200, frecuencia="anual"), HOY)["mensual"] == 100
    assert op.derivar_recurrente(recurrente(monto=100, frecuencia="quincenal"), HOY)["mensual"] == 200


def test_cuota_no_aplica_a_las_tarjetas():
    assert op.derivar_deuda(deuda(es_tarjeta=0))["modos_disponibles"] == ["cuota", "abono", "liquidar"]
    assert op.derivar_deuda(deuda(es_tarjeta=1))["modos_disponibles"] == ["abono", "liquidar"]
