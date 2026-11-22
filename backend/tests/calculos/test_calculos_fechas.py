import datetime

from backend.calculos.fechas import TZ, es_desactualizado


def test_desactualizado_corta_a_mediodia_bogota():
    hoy = datetime.date(2026, 6, 15)
    antes = datetime.datetime(2026, 6, 15, 11, 59, tzinfo=TZ)
    despues = datetime.datetime(2026, 6, 15, 12, 0, tzinfo=TZ)
    assert not es_desactualizado("2026-05-16", hoy, ahora=antes)
    assert es_desactualizado("2026-05-16", hoy, ahora=despues)
