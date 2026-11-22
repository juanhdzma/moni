import datetime

from backend.calculos.fechas import es_desactualizado

HOY = datetime.date(2026, 6, 15)


def test_desactualizado_a_los_30_dias_exactos():
    assert not es_desactualizado("2026-05-17", HOY)
    assert es_desactualizado("2026-05-16", HOY)


def test_desactualizado_ignora_el_reloj_real():
    assert es_desactualizado("2020-01-01", datetime.date(2020, 3, 1))
    assert not es_desactualizado("2020-01-01", datetime.date(2020, 1, 20))
    assert not es_desactualizado("", HOY)
