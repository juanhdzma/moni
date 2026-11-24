import pytest

from backend.core import db
from backend.push.suscripciones.endpoint import endpoint_permitido
from backend.tests.push.ayudas_push import SUB


def test_subscribe_guarda_y_es_idempotente(client):
    assert client.post("/api/push/subscribe", json=SUB).status_code == 200
    assert client.post("/api/push/subscribe", json={**SUB, "keys": {"p256dh": "otra", "auth": "x"}}).status_code == 200

    conn = db.get_conn()
    rows = conn.execute("SELECT * FROM push_subs").fetchall()
    conn.close()
    assert len(rows) == 1 and rows[0]["p256dh"] == "otra"


@pytest.mark.parametrize(
    "endpoint",
    ["http://fcm.googleapis.com/x", "https://evil.example.com/x", "https://fcm.googleapis.com.evil.com/x", "ftp://push.apple.com/x"],
)
def test_subscribe_rechaza_endpoints_ajenos(client, endpoint):
    assert client.post("/api/push/subscribe", json={**SUB, "endpoint": endpoint}).status_code == 422


def test_unsubscribe_borra(client):
    client.post("/api/push/subscribe", json=SUB)
    assert client.post("/api/push/unsubscribe", json={"endpoint": SUB["endpoint"]}).status_code == 200

    conn = db.get_conn()
    n = conn.execute("SELECT COUNT(*) FROM push_subs").fetchone()[0]
    conn.close()
    assert n == 0


def test_unsubscribe_limita_endpoint(client):
    assert client.post("/api/push/unsubscribe", json={"endpoint": "x" * 1001}).status_code == 422


@pytest.mark.parametrize(
    "endpoint",
    ["https://evil.com\\@fcm.googleapis.com/x", "https://user:pw@fcm.googleapis.com/x", "https://fcm.googleapis.com:8443/x"],
)
def test_endpoint_rechaza_parsers_discordantes(endpoint):
    assert not endpoint_permitido(endpoint)


def test_key_es_un_punto_p256_en_base64url(client):
    k = client.get("/api/push/key").json()["key"]
    assert len(k) == 87 and "=" not in k
    assert client.get("/api/push/key").json()["key"] == k
