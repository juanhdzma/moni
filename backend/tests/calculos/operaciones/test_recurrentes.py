import pytest

from backend.calculos import operaciones as op

from ..helpers_operaciones import D, fecha, recurrente


def proxima(inicio, frec, hoy):
    return op.frecuencias.proxima_fecha_recurrente(inicio, frec, fecha(hoy))


def test_pago_que_cae_hoy_es_hoy():
    assert proxima("2026-08-01", "mensual", "2026-08-01") == D(2026, 8, 1)


def test_dia_del_mes_se_mantiene_y_recorta():
    assert proxima("2026-01-31", "mensual", "2026-02-05") == D(2026, 2, 28)
    assert proxima("2026-01-31", "mensual", "2026-03-01") == D(2026, 3, 31)
    assert proxima("2026-01-31", "mensual", "2026-02-10") == D(2026, 2, 28)


def test_inicio_a_futuro_devuelve_el_inicio():
    assert proxima("2026-12-10", "mensual", "2026-08-01") == D(2026, 12, 10)


def test_semanal_y_quincenal():
    assert proxima("2026-07-28", "semanal", "2026-08-01") == D(2026, 8, 4)
    assert proxima("2026-08-01", "semanal", "2026-08-01") == D(2026, 8, 1)
    assert proxima("2026-07-20", "quincenal", "2026-08-01") == D(2026, 8, 3)
    assert proxima("2026-06-01", "semanal", "2026-06-09") == D(2026, 6, 15)


def test_anual():
    assert proxima("2025-03-10", "anual", "2026-08-01") == D(2027, 3, 10)
    assert proxima("2025-10-10", "anual", "2026-08-01") == D(2026, 10, 10)


def test_resultado_nunca_en_el_pasado():
    hoy = D(2026, 8, 1)
    for frec in op.frecuencias.FRECUENCIAS:
        for inicio in ["2020-01-01", "2024-02-29", "2026-07-31", "2026-08-01"]:
            assert op.frecuencias.proxima_fecha_recurrente(inicio, frec, hoy) >= hoy


def test_frecuencia_desconocida_o_fecha_vacia():
    assert proxima("", "mensual", "2026-08-01") is None
    assert proxima("2026-08-01", "cada rato", "2026-08-01") is None


def test_derivar_recurrente():
    d = op.derivar_recurrente(recurrente(fecha_inicio="2026-01-15"), D(2026, 8, 1))
    assert d["proximo_pago"] == {"fecha": "2026-08-15", "texto": "en 14d"}
    assert d["activo"] is True and d["frecuencia_label"] == "Mensual" and d["mensual"] == 100
    assert op.derivar_recurrente(recurrente(fecha_inicio="2026-08-01"), D(2026, 8, 1))["proximo_pago"]["texto"] == "hoy"
    pausada = op.derivar_recurrente(recurrente(activo=0), D(2026, 8, 1))
    assert pausada["proximo_pago"] is None and pausada["activo"] is False
    assert op.derivar_recurrente(recurrente(frecuencia="x"), D(2026, 8, 1))["frecuencia_label"] == "x"


def test_opciones_frecuencia_en_orden_con_value_y_label():
    assert op.frecuencias.opciones_frecuencia() == [
        {"value": "semanal", "label": "Semanal"}, {"value": "quincenal", "label": "Quincenal"},
        {"value": "mensual", "label": "Mensual"}, {"value": "bimestral", "label": "Bimestral"},
        {"value": "trimestral", "label": "Trimestral"}, {"value": "semestral", "label": "Semestral"},
        {"value": "anual", "label": "Anual"},
    ]


def test_to_mensual_por_frecuencia():
    m = op.frecuencias.to_mensual
    assert m(1200, "mensual") == 1200 and m(1200, "anual") == 100 and m(600, "bimestral") == 300
    assert m(900, "trimestral") == 300 and m(600, "semestral") == 100 and m(100, "quincenal") == 200
    assert m(12, "semanal") == pytest.approx(52) and m(100, "desconocida") == 100


def test_proxima_trimestral_y_semestral_con_inicio_en_el_pasado():
    assert proxima("2026-01-31", "trimestral", "2026-08-01") == D(2026, 10, 31)
    assert proxima("2026-01-15", "semestral", "2026-07-15") == D(2026, 7, 15)
    assert proxima("2026-01-15", "semestral", "2026-07-16") == D(2027, 1, 15)
    assert proxima("2025-12-01", "bimestral", "2026-08-01") == D(2026, 8, 1)
