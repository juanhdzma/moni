import pathlib
import tempfile

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    from backend import db

    monkeypatch.setattr(db, "DB_PATH", pathlib.Path(tempfile.mkdtemp()) / "test.db")
    from backend import main

    with TestClient(main.app) as c:
        # Todas las mutaciones exigen el header anti-CSRF (ver main.require_csrf_header).
        c.headers.update({main.CSRF_HEADER: "1"})
        yield c


@pytest.fixture
def tarjeta(client):
    return client.post(
        "/api/deuda",
        json={"nombre": "Visa", "monto_inicial": 0, "saldo_actual": 0, "es_tarjeta": True, "cupo": 1_000_000},
    ).json()


@pytest.fixture
def prestamo(client):
    return client.post(
        "/api/deuda",
        json={
            "nombre": "Credito",
            "monto_inicial": 1_000_000,
            "saldo_actual": 1_000_000,
            "tasa_ea": 24,
            "cuota_mensual": 100_000,
        },
    ).json()
