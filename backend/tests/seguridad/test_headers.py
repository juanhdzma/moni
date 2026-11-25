from fastapi.testclient import TestClient

from backend import main
from backend.tests.conftest import IP_TEST
from backend.tests.seguridad.helpers import cliente

CSP = (
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
    "script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)
PERMISSIONS = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
HSTS = "max-age=31536000; includeSubDomains"


def test_valores_exactos_de_los_headers_de_seguridad(anon_client):
    h = anon_client.get("/api/auth/estado").headers
    assert h["content-security-policy"] == CSP
    assert h["x-frame-options"] == "DENY"
    assert h["x-content-type-options"] == "nosniff"
    assert h["referrer-policy"] == "no-referrer"
    assert h["cross-origin-opener-policy"] == "same-origin"
    assert h["cross-origin-resource-policy"] == "same-origin"
    assert h["permissions-policy"] == PERMISSIONS
    assert h["cache-control"] == "no-store"
    assert "strict-transport-security" not in h


def test_headers_tambien_en_respuestas_de_error_y_en_el_frontend(anon_client):
    for r in (anon_client.get("/api/backup"), anon_client.get("/ruta-que-no-existe"), anon_client.get("/")):
        assert r.headers["content-security-policy"] == CSP
        assert r.headers["permissions-policy"] == PERMISSIONS
    assert anon_client.get("/api/backup").headers["cache-control"] == "no-store"
    assert anon_client.get("/").headers.get("cache-control") != "no-store"


def test_cache_control_no_store_solo_bajo_api_sin_importar_mayusculas_ni_barras(anon_client):
    assert anon_client.get("/API/auth/estado").headers["cache-control"] == "no-store"
    assert anon_client.get("/otra-cosa").headers.get("cache-control") != "no-store"


def test_hsts_exacto_en_https_directo(entorno):
    c = TestClient(main.app, base_url="https://testserver", client=IP_TEST)
    assert c.get("/api/auth/estado").headers["strict-transport-security"] == HSTS


def test_hsts_con_proxy_confiable_y_x_forwarded_proto(entorno, monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "10.0.0.0/8")
    c = cliente(("10.0.0.2", 1), **{"X-Forwarded-Proto": "https"})
    assert c.get("/api/auth/estado").headers["strict-transport-security"] == HSTS
    c = cliente(("10.0.0.2", 1), **{"X-Forwarded-Proto": "http, https"})
    assert c.get("/api/auth/estado").headers["strict-transport-security"] == HSTS
    c = cliente(("10.0.0.2", 1), **{"X-Forwarded-Proto": "https, http"})
    assert "strict-transport-security" not in c.get("/api/auth/estado").headers
    c = cliente(("10.0.0.2", 1), **{"X-Forwarded-Proto": " HTTPS "})
    assert c.get("/api/auth/estado").headers["strict-transport-security"] == HSTS


def test_x_forwarded_proto_de_peer_no_confiable_no_activa_hsts(entorno):
    c = cliente(IP_TEST, **{"X-Forwarded-Proto": "https"})
    assert "strict-transport-security" not in c.get("/api/auth/estado").headers
