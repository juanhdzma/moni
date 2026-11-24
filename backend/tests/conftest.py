import pathlib
import tempfile

import pytest
from fastapi.testclient import TestClient


CLAVE_TEST = "clave-de-prueba-123"
IP_TEST = ("198.51.100.7", 50000)
_HASH_TEST = []


def hash_test():
    if not _HASH_TEST:
        from backend.seguridad import password

        _HASH_TEST.append(password.hash_clave(CLAVE_TEST))
    return _HASH_TEST[0]


@pytest.fixture
def entorno(monkeypatch):
    from backend.core import db
    from backend.seguridad import bloqueo

    monkeypatch.setattr(db, "DB_PATH", pathlib.Path(tempfile.mkdtemp()) / "test.db")
    monkeypatch.setenv("MONI_PASSWORD_HASH", hash_test())
    for nombre in ("MONI_TRUSTED_PROXIES", "MONI_BLOCK_HOURS", "MONI_PUSH_TOKEN"):
        monkeypatch.delenv(nombre, raising=False)
    monkeypatch.setattr(bloqueo, "RETRASO_FALLO", 0)
    db.init_db()


@pytest.fixture
def anon_client(entorno):
    from backend import main
    from backend.core.csrf import CSRF_HEADER

    with TestClient(main.app, client=IP_TEST) as c:
        c.headers.update({CSRF_HEADER: "1"})
        yield c


@pytest.fixture
def client(anon_client):
    from backend.core import db
    from backend.seguridad import sesiones, tiempo

    token = "token-de-prueba-" + "x" * 32
    t = tiempo.ahora()
    conn = db.get_conn()
    try:
        conn.execute(
            "INSERT INTO sesiones (token_hash, creada, expira, ultimo_uso, ip, user_agent, metodo) VALUES (?, ?, ?, ?, '', '', 'clave')",
            (sesiones.hash_token(token), tiempo.iso(t), tiempo.iso(t.replace(year=t.year + 1)), tiempo.iso(t)),
        )
        conn.commit()
    finally:
        conn.close()
    anon_client.cookies.set(sesiones.COOKIE, token)
    return anon_client


@pytest.fixture
def tarjeta(client):
    return client.post(
        "/api/deuda",
        json={"nombre": "Visa", "monto_inicial": 0, "saldo_actual": 0, "clase_deuda": "tarjeta", "cupo": 1_000_000},
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
