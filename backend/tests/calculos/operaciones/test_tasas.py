import pytest

from backend.calculos.operaciones.tasas import equivalencia_tasa, normalizar_tasa


def test_normalizar_tasa_ea_se_redondea_a_dos_decimales():
    assert normalizar_tasa({"tasa_ea": 12.345, "tasa_tipo": "ea"}) == {"tasa_ea": 12.35}
    assert normalizar_tasa({"tasa_ea": 12.344}) == {"tasa_ea": 12.34}
    assert normalizar_tasa({"tasa_ea": 12.345, "otro": 1}) == {"tasa_ea": 12.35, "otro": 1}


def test_normalizar_tasa_mv_convierte_a_ea():
    assert normalizar_tasa({"tasa_ea": 1, "tasa_tipo": "mv"}) == {"tasa_ea": 12.68}
    assert normalizar_tasa({"tasa_ea": 2.5, "tasa_tipo": "mv"}) == {"tasa_ea": 34.49}


def test_normalizar_tasa_sin_tasa_solo_quita_el_tipo():
    assert normalizar_tasa({"tasa_ea": 0, "tasa_tipo": "mv"}) == {"tasa_ea": 0}
    assert normalizar_tasa({"tasa_ea": None, "tasa_tipo": "mv"}) == {"tasa_ea": None}
    assert normalizar_tasa({"nombre": "x"}) == {"nombre": "x"}


def test_equivalencia_tasa_ea_a_mv():
    r = equivalencia_tasa(12, "ea")
    assert r["ea"] == 12 and r["mv"] == pytest.approx(0.9489, abs=1e-4)
    assert r["texto"] == "Equivale a 0,9489% MV"


def test_equivalencia_tasa_mv_a_ea():
    r = equivalencia_tasa(1, "mv")
    assert r["mv"] == 1 and r["ea"] == pytest.approx(12.68, abs=1e-2)
    assert r["texto"] == "Equivale a 12,68% EA"


def test_equivalencia_tasa_invalida():
    assert equivalencia_tasa(-1, "mv") == {"ea": None, "mv": None, "texto": None}
