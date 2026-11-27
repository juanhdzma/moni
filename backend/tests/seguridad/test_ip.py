import logging

import pytest
from starlette.requests import Request

from backend.seguridad import ip
from backend.tests.conftest import IP_TEST
from backend.tests.seguridad.helpers import login, cliente


def test_xff_spoofing_desde_origen_no_confiable_se_ignora(entorno):
    for i in range(3):
        c = cliente(IP_TEST, **{"X-Forwarded-For": f"1.2.3.{i}"})
        assert login(c, "mala").status_code == 401
    c = cliente(IP_TEST, **{"X-Forwarded-For": "9.9.9.9"})
    assert login(c).status_code == 403


def test_xff_desde_proxy_confiable_se_respeta(entorno, monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "10.0.0.0/8")
    proxy = ("10.0.0.2", 1)
    for _ in range(3):
        c = cliente(proxy, **{"X-Forwarded-For": "203.0.113.50"})
        assert login(c, "mala").status_code == 401
    assert login(cliente(proxy, **{"X-Forwarded-For": "203.0.113.50"})).status_code == 403
    assert login(cliente(proxy, **{"X-Forwarded-For": "203.0.113.51"})).status_code == 200


def test_xff_spoof_dentro_de_cadena_toma_la_ultima_no_confiable(entorno, monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "10.0.0.0/8")
    proxy = ("10.0.0.2", 1)
    for i in range(3):
        c = cliente(proxy, **{"X-Forwarded-For": f"6.6.6.{i}, 203.0.113.60, 10.1.1.1"})
        login(c, "mala")
    c = cliente(proxy, **{"X-Forwarded-For": "7.7.7.7, 203.0.113.60"})
    assert login(c).status_code == 403


def test_client_ip_casos(monkeypatch):
    class Req:
        def __init__(self, host, xff=()):
            self.client = type("C", (), {"host": host})() if host else None
            self.headers = type("H", (), {"getlist": lambda s, k: list(xff)})()

    monkeypatch.delenv("MONI_TRUSTED_PROXIES", raising=False)
    assert ip.client_ip(Req("203.0.113.1", ["8.8.8.8"])) == "203.0.113.1"
    assert ip.client_ip(Req("127.0.0.1", ["8.8.8.8"])) == "8.8.8.8"
    assert ip.client_ip(Req("127.0.0.1", ["10.0.0.5, 192.168.1.1"])) == "192.168.1.1"
    assert ip.client_ip(Req("127.0.0.1", ["basura"])) == "127.0.0.1"
    assert ip.client_ip(Req("127.0.0.1", ["basura, 1.2.3.4"])) == "1.2.3.4"
    assert ip.client_ip(Req("192.168.1.5", ["8.8.8.8"])) == "192.168.1.5"
    assert ip.client_ip(Req("172.17.0.1", ["8.8.8.8"])) == "172.17.0.1"
    assert ip.client_ip(Req("10.0.0.2", ["8.8.8.8"])) == "10.0.0.2"
    assert ip.client_ip(Req("127.0.0.1", ["8.8.8.8", "1.1.1.1, 192.168.0.4"])) == "192.168.0.4"
    assert ip.client_ip(Req("127.0.0.1")) == "127.0.0.1"
    assert ip.client_ip(Req(None)) == "desconocida"
    assert ip.client_ip(Req("2001:db8:1:2:aaaa:bbbb:cccc:dddd")) == "2001:db8:1:2::/64"
    assert ip.client_ip(Req("::ffff:203.0.113.9")) == "203.0.113.9"
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "203.0.113.0/24")
    assert ip.client_ip(Req("203.0.113.1", ["8.8.8.8"])) == "8.8.8.8"
    assert ip.client_ip(Req("127.0.0.1", ["8.8.8.8"])) == "127.0.0.1"
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "no-es-cidr")
    assert ip.client_ip(Req("127.0.0.1", ["8.8.8.8"])) == "127.0.0.1"


@pytest.mark.parametrize("peer", ["172.17.0.1", "192.168.1.20", "10.0.0.2"])
def test_xff_rotando_desde_peer_privado_no_evade_el_bloqueo(entorno, peer):
    codigos = [login(cliente((peer, 1), **{"X-Forwarded-For": f"7.7.7.{i}"}), "mala").status_code for i in range(5)]
    assert codigos == [401, 401, 401, 403, 403]



def _request(peer, headers=None, scheme="http"):
    raw = [(k.lower().encode(), v.encode()) for k, v in (headers or [])]
    scope = {"type": "http", "method": "GET", "path": "/", "headers": raw, "scheme": scheme, "server": ("t", 80), "query_string": b""}
    scope["client"] = (peer, 1) if peer else None
    return Request(scope)


def _xff(*valores):
    return [("x-forwarded-for", v) for v in valores]


@pytest.mark.parametrize(
    "peer,esperado",
    [("127.0.0.1", "9.9.9.9"), ("127.255.255.254", "9.9.9.9"), ("::1", "9.9.9.9"), ("::ffff:127.0.0.1", "9.9.9.9"),
     ("128.0.0.1", "128.0.0.1"), ("basura", "basura")],
)
def test_proxies_por_defecto_son_loopback_v4_y_v6(monkeypatch, peer, esperado):
    monkeypatch.delenv("MONI_TRUSTED_PROXIES", raising=False)
    got = ip.client_ip(_request(peer, _xff("9.9.9.9")))
    assert got == (ip.normalizar_ip(esperado))


def test_default_proxies_constante_exacta():
    assert ip.DEFAULT_PROXIES == "127.0.0.0/8,::1/128"


def test_variable_vacia_no_confia_en_nadie(monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "")
    assert ip.client_ip(_request("127.0.0.1", _xff("9.9.9.9"))) == "127.0.0.1"


def test_variable_invalida_se_loguea_y_no_confia_en_nadie(monkeypatch, caplog):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "10.0.0.0/8,no-es-cidr")
    with caplog.at_level(logging.ERROR, logger="moni.auth"):
        assert ip.client_ip(_request("10.0.0.2", _xff("9.9.9.9"))) == "10.0.0.2"
    assert [r.getMessage() for r in caplog.records] == ["MONI_TRUSTED_PROXIES invalido, no se confia en ningun proxy"]


def test_cidr_con_bits_de_host_se_acepta_y_espacios_se_ignoran(monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", " 10.0.0.5/8 , 192.168.0.0/16 ")
    assert ip.client_ip(_request("10.200.1.1", _xff("9.9.9.9"))) == "9.9.9.9"
    assert ip.client_ip(_request("192.168.4.4", _xff("9.9.9.9"))) == "9.9.9.9"
    assert ip.client_ip(_request("172.16.0.1", _xff("9.9.9.9"))) == "172.16.0.1"


def test_proxy_ipv6_confiable_y_version_distinta_no_matchea(monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "2001:db8::/32")
    assert ip.client_ip(_request("2001:db8::5", _xff("9.9.9.9"))) == "9.9.9.9"
    assert ip.client_ip(_request("127.0.0.1", _xff("9.9.9.9"))) == "127.0.0.1"


def test_peer_ipv4_mapeado_en_ipv6_es_confiable_si_la_red_es_ipv4(monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "10.0.0.0/8")
    assert ip.client_ip(_request("::ffff:10.0.0.2", _xff("9.9.9.9"))) == "9.9.9.9"
    assert ip.client_ip(_request("::ffff:11.0.0.2", _xff("9.9.9.9"))) == "11.0.0.2"


def test_xff_con_varias_cabeceras_se_unen_y_se_toma_la_ultima_no_confiable(monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "10.0.0.0/8")
    assert ip.client_ip(_request("10.0.0.2", _xff("6.6.6.6", "7.7.7.7, 10.1.1.1"))) == "7.7.7.7"


def test_xff_todo_confiable_devuelve_la_primera(monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "10.0.0.0/8")
    assert ip.client_ip(_request("10.0.0.2", _xff("10.1.1.1, 10.2.2.2"))) == "10.1.1.1"


def test_xff_ignora_entradas_que_no_son_ip_y_normaliza_el_cliente(monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "10.0.0.0/8")
    assert ip.client_ip(_request("10.0.0.2", _xff("basura, 2001:db8:1:2:aaaa::1, 10.1.1.1"))) == "2001:db8:1:2::/64"
    assert ip.client_ip(_request("10.0.0.2", _xff("::ffff:203.0.113.9"))) == "203.0.113.9"
    assert ip.client_ip(_request("10.0.0.2", _xff("basura"))) == "10.0.0.2"


def test_sin_peer_es_desconocida_aunque_haya_xff():
    assert ip.client_ip(_request(None, _xff("9.9.9.9"))) == "desconocida"


@pytest.mark.parametrize(
    "valor,esperado",
    [("1.2.3.4", "1.2.3.4"), ("  1.2.3.4 ", "1.2.3.4"), ("::ffff:1.2.3.4", "1.2.3.4"), ("2001:db8::1", "2001:db8::/64"),
     ("2001:db8:0:0:ffff:ffff:ffff:ffff", "2001:db8::/64"), ("2001:db8:0:1::1", "2001:db8:0:1::/64"), ("::1", "::/64"),
     (" basura ", "basura"), ("", "")],
)
def test_normalizar_ip(valor, esperado):
    assert ip.normalizar_ip(valor) == esperado


@pytest.mark.parametrize("valor,es", [("1.2.3.4", True), ("::1", True), ("1.2.3", False), ("", False), ("1.2.3.4/8", False)])
def test_es_ip(valor, es):
    assert ip._es_ip(valor) is es


def test_es_confiable_ip_invalida_es_false():
    assert ip._es_confiable("basura", ip._redes("0.0.0.0/0")) is False
    assert ip._es_confiable("", ip._redes("0.0.0.0/0")) is False
    assert ip._es_confiable("1.2.3.4", ()) is False


def test_es_https_por_esquema_o_por_proxy_confiable(monkeypatch):
    monkeypatch.delenv("MONI_TRUSTED_PROXIES", raising=False)
    assert ip.es_https(_request("198.51.100.7", scheme="https")) is True
    assert ip.es_https(_request("198.51.100.7")) is False
    assert ip.es_https(_request("127.0.0.1", [("x-forwarded-proto", "https")])) is True
    assert ip.es_https(_request("127.0.0.1", [("x-forwarded-proto", "http")])) is False
    assert ip.es_https(_request("127.0.0.1")) is False
    assert ip.es_https(_request("198.51.100.7", [("x-forwarded-proto", "https")])) is False
    assert ip.es_https(_request(None, [("x-forwarded-proto", "https")])) is False


def test_aviso_de_xff_desde_peer_no_confiable_exacto_y_una_sola_vez(monkeypatch, caplog):
    monkeypatch.delenv("MONI_TRUSTED_PROXIES", raising=False)
    monkeypatch.setattr(ip, "_xff_avisado", False)
    caplog.set_level(logging.WARNING, logger="moni.auth")
    ip.client_ip(_request("203.0.113.1", _xff("9.9.9.9")))
    ip.client_ip(_request("203.0.113.1", _xff("9.9.9.9")))
    assert [r.getMessage() for r in caplog.records] == [
        "llega X-Forwarded-For desde peer=203.0.113.1 que no es proxy confiable; "
        "si hay un reverse proxy, definí MONI_TRUSTED_PROXIES o todos los clientes comparten una IP"
    ]


def test_sin_xff_no_hay_aviso(monkeypatch, caplog):
    monkeypatch.delenv("MONI_TRUSTED_PROXIES", raising=False)
    monkeypatch.setattr(ip, "_xff_avisado", False)
    caplog.set_level(logging.WARNING, logger="moni.auth")
    ip.client_ip(_request("203.0.113.1"))
    assert caplog.records == []


def _servir_con_uvicorn(proxy_headers):
    import socket
    import threading
    import time

    import uvicorn
    from fastapi import FastAPI

    app = FastAPI()

    @app.get("/ip")
    def _ip(request: Request):
        return {"ip": ip.client_ip(request)}

    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        puerto = s.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=puerto, proxy_headers=proxy_headers, log_level="error"))
    hilo = threading.Thread(target=server.run, daemon=True)
    hilo.start()
    while not server.started:
        time.sleep(0.01)
    return server, hilo, puerto


def test_xff_desde_loopback_bajo_uvicorn_real_lo_resuelve_moni_trusted_proxies(entorno, monkeypatch):
    import http.client

    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "10.0.0.0/8")
    server, hilo, puerto = _servir_con_uvicorn(proxy_headers=False)
    try:
        conn = http.client.HTTPConnection("127.0.0.1", puerto)
        conn.request("GET", "/ip", headers={"X-Forwarded-For": "203.0.113.9"})
        assert conn.getresponse().read() == b'{"ip":"127.0.0.1"}'
    finally:
        server.should_exit = True
        hilo.join(5)


def test_dockerfile_desactiva_los_proxy_headers_de_uvicorn():
    from pathlib import Path

    cmd = (Path(__file__).resolve().parents[3] / "Dockerfile").read_text().splitlines()[-1]
    assert "--no-proxy-headers" in cmd
