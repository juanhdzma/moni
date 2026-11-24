import pytest

from backend.calculos.numeros import pesos


@pytest.mark.parametrize("entrada,esperado", [
    (0.5, 1), (1.5, 2), (2.5, 3), (10.5, 11), (100.4, 100), (100.5, 101),
    (-0.4, 0), (-10.4, -10), (-10.5, -10), (-10.6, -11),
])
def test_pesos_half_up(entrada, esperado):
    assert pesos(entrada) == esperado
    assert isinstance(pesos(entrada), float)
