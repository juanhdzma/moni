import datetime
import time
from types import SimpleNamespace

import pytest

from backend.calculos.base import fechas as F
from backend.calculos.catalogo.constantes import DIAS_DESACTUALIZADO

D = datetime.date


@pytest.fixture
def reloj(monkeypatch):
    class Falso(datetime.datetime):
        instante = datetime.datetime(2026, 1, 1, 3, 5, tzinfo=datetime.timezone.utc)

        @classmethod
        def now(cls, tz=None):
            return cls.instante.astimezone(tz) if tz else cls.instante.replace(tzinfo=None)

    monkeypatch.setattr(F, "datetime", SimpleNamespace(**{**vars(datetime), "datetime": Falso}))
    return Falso


def test_ahora_bogota_es_gmt_menos_5_aunque_el_proceso_este_en_utc(monkeypatch):
    monkeypatch.setenv("TZ", "UTC")
    time.tzset()
    try:
        ahora = F.ahora_bogota()
        assert ahora.utcoffset() == datetime.timedelta(hours=-5)
        assert F.hoy_bogota() == ahora.date()
    finally:
        monkeypatch.undo()
        time.tzset()


def test_hoy_y_ahora_siguen_a_bogota_cruzando_medianoche_utc(reloj):
    assert F.ahora_bogota().isoformat() == "2025-12-31T22:05:00-05:00"
    assert F.hoy_bogota() == D(2025, 12, 31)
    assert F.ahora_bogota_iso() == "2025-12-31T22:05"
    assert F.fecha_o_ahora(None) == "2025-12-31T22:05"
    assert F.fecha_o_ahora("") == "2025-12-31T22:05"
    assert F.fecha_o_ahora("2026-02-02") == "2026-02-02"


@pytest.mark.parametrize("entrada,esperado", [
    (None, ""), ("", ""), ("2026-08-03", "2026-08-03"), ("  2026-08-03  ", "2026-08-03"),
    ("2026-08-03T14:05", "2026-08-03T14:05"), ("2026-08-03 14:05", "2026-08-03T14:05"),
    ("2026-08-03T14:05:59", "2026-08-03T14:05"), ("3/8/2026", "2026-08-03"), ("3-8-2026", "2026-08-03"),
    ("03/08/2026 9:05", "2026-08-03T09:05"), ("3/8/2026, 14:05", "2026-08-03T14:05"), ("basura", "basura"),
])
def test_normalizar_fecha(entrada, esperado):
    assert F.normalizar_fecha(entrada) == esperado


def test_parse_fecha():
    assert F.parse_fecha("2026-08-03T14:05") == D(2026, 8, 3)
    assert F.parse_fecha("3/8/2026") == D(2026, 8, 3)
    assert F.parse_fecha("2026-13-45") is None and F.parse_fecha("") is None and F.parse_fecha(None) is None


def test_parse_fecha_hora():
    assert F.parse_fecha_hora("2026-08-03") == datetime.datetime(2026, 8, 3, 0, 0)
    assert F.parse_fecha_hora("2026-08-03T14:05") == datetime.datetime(2026, 8, 3, 14, 5)
    assert F.parse_fecha_hora("2026-08-03T14:05:59") == datetime.datetime(2026, 8, 3, 14, 5)
    assert F.parse_fecha_hora("3/8/2026 09:07") == datetime.datetime(2026, 8, 3, 9, 7)
    assert F.parse_fecha_hora("2026-08-03T25:00") is None
    assert F.parse_fecha_hora("2026-08-03T14:61") is None
    assert F.parse_fecha_hora("nope") is None


@pytest.mark.parametrize("s,ok", [
    ("2026-08-03", True), ("2026-08-03T14:05", True), ("2026-08-03 14:05", True), ("2026-08-03T14:05:59", True),
    ("2026-08-03T14:05:59.1", False), ("2026-08-0", False), ("2026-08-03T14", False), ("2026-08-03T14:0", False),
    ("2026-13-45", False), ("2026-08-03T24:00", False), ("3/8/2026", False), ("", False), ("2026-08-03Z", False),
])
def test_es_fecha_iso(s, ok):
    assert F.es_fecha_iso(s) is ok


def test_mes_de():
    assert F.mes_de("2026-08-03T10:00") == "2026-08" and F.mes_de("3/8/2026") == "2026-08" and F.mes_de(None) == ""


def test_sumar_meses_ancla_y_recorta_el_dia():
    assert F.sumar_meses(D(2026, 1, 31), 1, 31) == D(2026, 2, 28)
    assert F.sumar_meses(D(2024, 1, 31), 1, 31) == D(2024, 2, 29)
    assert F.sumar_meses(D(2026, 12, 15), 1, 15) == D(2027, 1, 15)
    assert F.sumar_meses(D(2026, 1, 15), -1, 15) == D(2025, 12, 15)
    assert F.sumar_meses(D(2026, 8, 15), 0, 31) == D(2026, 8, 31)
    assert F.sumar_meses(D(2026, 8, 15), 12, 5) == D(2027, 8, 5)


def test_restar_meses_conserva_la_hora_y_cruza_el_anio():
    assert F.restar_meses(datetime.datetime(2026, 1, 31, 9, 30), 2) == datetime.datetime(2025, 11, 30, 9, 30)
    assert F.restar_meses(datetime.datetime(2026, 3, 31, 23, 59), 1) == datetime.datetime(2026, 2, 28, 23, 59)
    assert F.restar_meses(datetime.datetime(2026, 1, 1), 1) == datetime.datetime(2025, 12, 1)


def test_nombres_de_mes():
    assert [F.mes_corto(m) for m in (1, 9, 12)] == ["ene.", "sept.", "dic."]
    assert [F.nombre_mes(m) for m in (1, 9, 12)] == ["Enero", "Septiembre", "Diciembre"]


def test_texto_dias():
    assert [F.texto_dias(d) for d in (0, 1, 2, -1, -5)] == ["hoy", "mañana", "en 2d", "vencido 1d", "vencido 5d"]
    assert [F.texto_dias_corto(d) for d in (0, 1, 7, -3)] == ["hoy", "en 1d", "en 7d", "en -3d"]


def test_redondear_js_es_half_up():
    assert [F.redondear_js(x) for x in (0.5, 1.5, 2.5, -0.5, -1.5, 2.4999)] == [1, 2, 3, 0, -1, 2]


def test_es_desactualizado_en_el_borde_de_dias():
    hoy = D(2026, 8, 31)
    assert DIAS_DESACTUALIZADO == 30
    assert F.es_desactualizado("2026-08-01", hoy) is True
    assert F.es_desactualizado("2026-08-02", hoy) is False
    assert F.es_desactualizado("2026-08-31", hoy) is False
    assert F.es_desactualizado("2026-08-02T08:00", hoy) is False
    assert F.es_desactualizado("2026-08-30", hoy, dias=1) is True
    assert F.es_desactualizado("2026-08-31", hoy, dias=1) is False
    assert F.es_desactualizado("2026-08-31", hoy, dias=0) is True


def test_es_desactualizado_sin_fecha_o_invalida_no_alerta():
    assert F.es_desactualizado(None, D(2026, 8, 31)) is False
    assert F.es_desactualizado("", D(2026, 8, 31)) is False
    assert F.es_desactualizado("basura", D(2026, 8, 31)) is False
    assert F.es_desactualizado("2020-01-01", D(2026, 8, 31)) is True
