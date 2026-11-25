import logging

import pytest

from backend.core import db
from backend.push import envio


def test_bearer_push_corto_se_rechaza(anon_client, monkeypatch):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "corto")
    r = anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}, headers={"Authorization": "Bearer corto"})
    assert r.status_code == 401


def test_bearer_no_abre_otras_rutas(anon_client, monkeypatch):
    token = "t" * 40
    monkeypatch.setenv("MONI_PUSH_TOKEN", token)
    h = {"Authorization": f"Bearer {token}"}
    for p in ("/api/backup", "/api/push/test", "/api/truncate"):
        assert anon_client.request("POST" if p != "/api/backup" else "GET", p, headers=h).status_code == 401


ENVIAR = "/api/push/enviar"
CUERPO = {"title": "a", "body": ""}


@pytest.fixture(autouse=True)
def sin_envio_real(monkeypatch):
    monkeypatch.setattr(envio, "webpush", lambda *a, **kw: None)


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


def _intentos():
    conn = db.get_conn()
    try:
        return [tuple(f) for f in conn.execute("SELECT ip, motivo FROM intentos_fallidos")]
    finally:
        conn.close()


@pytest.mark.parametrize("largo,esperado", [(31, 401), (32, 200), (33, 200)])
def test_largo_minimo_del_token_configurado(anon_client, monkeypatch, largo, esperado):
    token = "k" * largo
    monkeypatch.setenv("MONI_PUSH_TOKEN", token)
    assert anon_client.post(ENVIAR, json=CUERPO, headers=_bearer(token)).status_code == esperado


def test_token_corto_cuenta_como_fallo_de_push_token(anon_client, monkeypatch):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "k" * 31)
    anon_client.post(ENVIAR, json=CUERPO, headers=_bearer("k" * 31))
    assert _intentos() == [("198.51.100.7", "push_token")]


def test_tres_bearer_fallidos_bloquean_la_ip_con_retry_after(anon_client, monkeypatch):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "t" * 40)
    codigos = [anon_client.post(ENVIAR, json=CUERPO, headers=_bearer("x" * 40)).status_code for _ in range(3)]
    assert codigos == [401, 401, 401]
    r = anon_client.post(ENVIAR, json=CUERPO, headers=_bearer("t" * 40))
    assert r.status_code == 403
    assert r.headers["retry-after"] == "86400"
    assert r.json() == {
        "detail": "IP bloqueada",
        "reintentar_en_s": 86400,
        "texto": "Demasiados intentos. Probá de nuevo en 24 h.",
    }
    assert anon_client.get("/api/auth/estado").status_code == 403


def test_dos_bearer_fallidos_no_bloquean(anon_client, monkeypatch):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "t" * 40)
    for _ in range(2):
        anon_client.post(ENVIAR, json=CUERPO, headers=_bearer("x" * 40))
    assert anon_client.post(ENVIAR, json=CUERPO, headers=_bearer("t" * 40)).status_code == 200


@pytest.mark.parametrize("cabecera", ["Basic abc", "Token " + "t" * 40, "bearer", "t" * 40, ""])
def test_cabecera_que_no_es_bearer_es_401_y_no_cuenta_fallo(anon_client, monkeypatch, cabecera):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "t" * 40)
    for _ in range(5):
        assert anon_client.post(ENVIAR, json=CUERPO, headers={"Authorization": cabecera}).status_code == 401
    assert _intentos() == []


@pytest.mark.parametrize("cabecera", ["bearer " + "t" * 40, "BEARER " + "t" * 40, "Bearer   " + "t" * 40 + "  "])
def test_bearer_ignora_mayusculas_y_espacios(anon_client, monkeypatch, cabecera):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "t" * 40)
    assert anon_client.post(ENVIAR, json=CUERPO, headers={"Authorization": cabecera}).status_code == 200


def test_bearer_con_prefijo_o_sufijo_del_token_no_vale(anon_client, monkeypatch):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "t" * 40)
    assert anon_client.post(ENVIAR, json=CUERPO, headers=_bearer("t" * 39)).status_code == 401
    assert anon_client.post(ENVIAR, json=CUERPO, headers=_bearer("t" * 41)).status_code == 401


def test_con_sesion_el_bearer_malo_no_cuenta_fallo(client, monkeypatch):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "t" * 40)
    for _ in range(4):
        assert client.post(ENVIAR, json=CUERPO, headers=_bearer("x" * 40)).status_code == 200
    assert _intentos() == []


def test_ip_ya_bloqueada_no_evalua_el_token(anon_client, monkeypatch):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "t" * 40)
    for _ in range(3):
        anon_client.post(ENVIAR, json=CUERPO, headers=_bearer("x" * 40))
    anon_client.post(ENVIAR, json=CUERPO, headers=_bearer("x" * 40))
    assert _intentos() == []


def test_el_envio_con_token_se_registra_como_via_token_y_con_sesion_como_sesion(anon_client, client, monkeypatch, caplog):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "t" * 40)
    caplog.set_level(logging.INFO)
    sesion = client.post(ENVIAR, json=CUERPO)
    assert sesion.status_code == 200 and "via=sesion" in caplog.text
    caplog.clear()
    anon_client.cookies.clear()
    assert anon_client.post(ENVIAR, json=CUERPO, headers=_bearer("t" * 40)).status_code == 200
    assert "via=token" in caplog.text and "via=sesion" not in caplog.text
