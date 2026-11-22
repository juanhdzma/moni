import pytest

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
