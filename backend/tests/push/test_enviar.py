import pytest

from backend.core import db
from backend.push import envio, envio_rutas

TOKEN = "t" * 40
OK = {"title": "Hola", "body": "Mundo", "url": "/deudas", "tag": "aviso"}


@pytest.fixture(autouse=True)
def limpio():
    envio_rutas._envios.clear()
    yield
    envio_rutas._envios.clear()


@pytest.fixture
def con_token(anon_client, monkeypatch):
    monkeypatch.setenv("MONI_PUSH_TOKEN", TOKEN)


@pytest.fixture
def enviados(monkeypatch):
    llamadas = []
    monkeypatch.setattr(envio, "webpush", lambda info, data, **kw: llamadas.append(data))
    conn = db.get_conn()
    conn.execute("INSERT INTO push_subs (endpoint, p256dh, auth) VALUES ('https://fcm.googleapis.com/a', 'k', 'a')")
    conn.commit()
    conn.close()
    return llamadas


def test_sin_auth_401(anon_client, enviados):
    assert anon_client.post("/api/push/enviar", json=OK).status_code == 401
    assert enviados == []


def test_con_sesion_ok_e_incluye_url_y_tag(client, enviados):
    r = client.post("/api/push/enviar", json=OK)
    assert r.status_code == 200
    assert r.json() == {"enviadas": 1, "eliminadas": 0}
    assert '"url": "/deudas"' in enviados[0] and '"tag": "aviso"' in enviados[0]


def test_con_bearer_ok(anon_client, con_token, enviados):
    r = anon_client.post("/api/push/enviar", json=OK, headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 200 and r.json()["enviadas"] == 1


def test_bearer_malo_cuenta_fallo_y_a_la_tercera_bloquea(anon_client, con_token, enviados):
    h = {"Authorization": "Bearer " + "x" * 40}
    assert [anon_client.post("/api/push/enviar", json=OK, headers=h).status_code for _ in range(3)] == [401, 401, 401]
    r = anon_client.post("/api/push/enviar", json=OK, headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 403 and r.json()["detail"] == "IP bloqueada"
    assert enviados == []


def test_bearer_sin_token_configurado_falla(anon_client, enviados):
    r = anon_client.post("/api/push/enviar", json=OK, headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 401


def test_payload_demasiado_grande(client, enviados):
    r = client.post("/api/push/enviar", json={"title": "t", "body": "\U0001F600" * 300})
    assert r.status_code == 413
    assert enviados == []


@pytest.mark.parametrize("url", ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "deudas", "/" + "a" * 200])
def test_url_externa_o_invalida_rechazada(client, enviados, url):
    assert client.post("/api/push/enviar", json={**OK, "url": url}).status_code == 422
    assert enviados == []


@pytest.mark.parametrize("campo", [{"title": ""}, {"title": "x" * 81}, {"body": "x" * 301}, {"tag": "x" * 41}])
def test_limites_de_campos(client, campo):
    assert client.post("/api/push/enviar", json={**OK, **campo}).status_code == 422


def test_rate_limit(client, enviados):
    codigos = [client.post("/api/push/enviar", json=OK).status_code for _ in range(21)]
    assert codigos[:20] == [200] * 20
    assert codigos[20] == 429


def test_test_y_key_exigen_sesion(anon_client):
    assert anon_client.post("/api/push/test").status_code == 401
    assert anon_client.get("/api/push/key").status_code == 401
    assert anon_client.post("/api/push/subscribe", json={"endpoint": "https://fcm.googleapis.com/x", "keys": {"p256dh": "a", "auth": "b"}}).status_code == 401


def test_limitar_purga_ips_vencidas(monkeypatch):
    class Req:
        client = type("C", (), {"host": "9.9.9.9"})()
        headers = {}

    envio_rutas._envios["1.1.1.1"].append(0.0)
    monkeypatch.setattr(envio_rutas.time, "monotonic", lambda: 1000.0)
    monkeypatch.setattr(envio_rutas, "client_ip", lambda r: "9.9.9.9")
    envio_rutas._limitar(Req())
    assert list(envio_rutas._envios) == ["9.9.9.9"]


def test_push_test_comparte_rate_limit(client, enviados):
    codigos = [client.post("/api/push/test").status_code for _ in range(21)]
    assert codigos[:20] == [200] * 20
    assert codigos[20] == 429
