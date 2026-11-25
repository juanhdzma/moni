import pytest

from backend.calculos.base import fechas

from .builders_api import AHORA


@pytest.fixture(autouse=True)
def reloj_fijo(monkeypatch):
    monkeypatch.setattr(fechas, "ahora_bogota", lambda: AHORA)
