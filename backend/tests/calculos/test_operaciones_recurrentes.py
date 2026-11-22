from backend.calculos import operaciones as op

from .helpers_operaciones import D, fecha, recurrente


def proxima(inicio, frec, hoy):
    return op.proxima_fecha_recurrente(inicio, frec, fecha(hoy))


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
    for frec in op.FRECUENCIAS:
        for inicio in ["2020-01-01", "2024-02-29", "2026-07-31", "2026-08-01"]:
            assert op.proxima_fecha_recurrente(inicio, frec, hoy) >= hoy


def test_frecuencia_desconocida_o_fecha_vacia():
    assert proxima("", "mensual", "2026-08-01") is None
    assert proxima("2026-08-01", "cada rato", "2026-08-01") is None


def test_to_mensual():
    assert op.to_mensual(100, "mensual") == 100
    assert op.to_mensual(100, "quincenal") == 200
    assert op.to_mensual(1200, "anual") == 100
    assert op.to_mensual(100, "loquesea") == 100


def test_derivar_recurrente():
    d = op.derivar_recurrente(recurrente(fecha_inicio="2026-01-15"), D(2026, 8, 1))
    assert d["proximo_pago"] == {"fecha": "2026-08-15", "dias": 14, "texto": "en 14d"}
    assert d["activo"] is True and d["frecuencia_label"] == "Mensual" and d["mensual"] == 100
    assert op.derivar_recurrente(recurrente(fecha_inicio="2026-08-01"), D(2026, 8, 1))["proximo_pago"]["texto"] == "hoy"
    pausada = op.derivar_recurrente(recurrente(activo=0), D(2026, 8, 1))
    assert pausada["proximo_pago"] is None and pausada["activo"] is False
    assert op.derivar_recurrente(recurrente(frecuencia="x"), D(2026, 8, 1))["frecuencia_label"] == "x"
