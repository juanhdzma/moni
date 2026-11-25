import pytest

from backend.calculos.base.numeros import monto_firmado, porcentaje, pesos


@pytest.mark.parametrize("entrada,esperado", [
    (0.5, 1), (1.5, 2), (2.5, 3), (10.5, 11), (100.4, 100), (100.5, 101),
    (-0.4, 0), (-10.4, -10), (-10.5, -10), (-10.6, -11),
])
def test_pesos_half_up(entrada, esperado):
    assert pesos(entrada) == esperado
    assert isinstance(pesos(entrada), float)


def test_porcentaje():
    assert porcentaje(50, 200) == 25
    assert porcentaje(-50, 200) == -25
    assert porcentaje(1, 1) == 100
    assert porcentaje(5, 0) == 0
    assert porcentaje(5, -10) == 0
    assert porcentaje(0, 10) == 0


def test_monto_firmado_solo_el_ingreso_suma():
    assert monto_firmado("ingreso", 10) == 10
    assert monto_firmado("gasto", 10) == -10
    assert monto_firmado("transfer", 10) == -10
