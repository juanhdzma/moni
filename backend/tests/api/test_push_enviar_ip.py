import pytest

from backend.push import envio, rutas
from backend.tests.conftest import IP_TEST

BODY = {"title": "Hola", "body": "Mundo"}
LIMITE = 20


@pytest.fixture(autouse=True)
def limpio(monkeypatch):
    rutas._envios.clear()
    monkeypatch.setattr(envio, "webpush", lambda info, data, **kw: None)
    yield
    rutas._envios.clear()


def _enviar(client, ip_real):
    return client.post("/api/push/enviar", json=BODY, headers={"X-Forwarded-For": ip_real}).status_code


def test_el_limite_se_cuenta_por_ip_del_xff_cuando_el_peer_es_proxy_confiable(client, monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", IP_TEST[0])
    assert [_enviar(client, "203.0.113.1") for _ in range(LIMITE + 1)] == [200] * LIMITE + [429]
    assert _enviar(client, "203.0.113.2") == 200
    assert sorted(rutas._envios) == ["203.0.113.1", "203.0.113.2"]


def test_el_429_trae_retry_after(client, monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", IP_TEST[0])
    for _ in range(LIMITE):
        _enviar(client, "203.0.113.1")
    r = client.post("/api/push/enviar", json=BODY, headers={"X-Forwarded-For": "203.0.113.1"})
    assert r.status_code == 429 and int(r.headers["Retry-After"]) > 0


def test_un_peer_no_confiable_no_puede_rotar_ip_con_xff(client):
    codigos = [_enviar(client, f"203.0.113.{n}") for n in range(1, LIMITE + 2)]
    assert codigos == [200] * LIMITE + [429]
    assert list(rutas._envios) == [IP_TEST[0]]
