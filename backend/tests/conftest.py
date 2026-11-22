import pathlib
import tempfile

import pytest
from fastapi.testclient import TestClient


CLAVE_TEST = "clave-de-prueba-123"
IP_TEST = ("198.51.100.7", 50000)
_HASH_TEST = []


def hash_test():
    if not _HASH_TEST:
        from backend import auth

        _HASH_TEST.append(auth.hash_clave(CLAVE_TEST))
    return _HASH_TEST[0]


@pytest.fixture
def entorno(monkeypatch):
    from backend import auth, db

    monkeypatch.setattr(db, "DB_PATH", pathlib.Path(tempfile.mkdtemp()) / "test.db")
    monkeypatch.setenv("MONI_PASSWORD_HASH", hash_test())
    for nombre in ("MONI_TRUSTED_PROXIES", "MONI_BLOCK_HOURS", "MONI_PUSH_TOKEN"):
        monkeypatch.delenv(nombre, raising=False)
    monkeypatch.setattr(auth, "RETRASO_FALLO", 0)
    db.init_db()


@pytest.fixture
def anon_client(entorno):
    from backend import main

    with TestClient(main.app, client=IP_TEST) as c:
        c.headers.update({main.CSRF_HEADER: "1"})
        yield c


@pytest.fixture
def client(anon_client):
    from backend import auth, db

    token = "token-de-prueba-" + "x" * 32
    t = auth.ahora()
    conn = db.get_conn()
    try:
        conn.execute(
            "INSERT INTO sesiones (token_hash, creada, expira, ultimo_uso, ip, user_agent, metodo) VALUES (?, ?, ?, ?, '', '', 'clave')",
            (auth._hash_token(token), auth.iso(t), auth.iso(t.replace(year=t.year + 1)), auth.iso(t)),
        )
        conn.commit()
    finally:
        conn.close()
    anon_client.cookies.set(auth.COOKIE, token)
    return anon_client


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
