import pytest

from backend.core.csrf import CSRF_HEADER

MUTANTES = [
    ("POST", "/api/truncate"),
    ("POST", "/api/import"),
    ("POST", "/api/tx"),
    ("DELETE", "/api/deuda/1"),
    ("POST", "/api/deuda/1/pago/preview"),
    ("POST", "/api/auth/logout"),
    ("POST", "/api/push/subscribe"),
    ("POST", "/api/push/enviar"),
    ("PUT", "/api/ajustes"),
    ("POST", "/api/categorias"),
    ("DELETE", "/api/categorias"),
    ("POST", "/api/ops-ocultas"),
    ("DELETE", "/api/ops-ocultas"),
]


@pytest.mark.parametrize("metodo,path", MUTANTES)
def test_mutacion_sin_header_es_rechazada(client, metodo, path):
    del client.headers[CSRF_HEADER]
    r = client.request(metodo, path, json={})
    assert r.status_code == 403
    assert CSRF_HEADER in r.json()["detail"]


def test_lectura_no_necesita_header(client):
    del client.headers[CSRF_HEADER]
    assert client.get("/api/meta").status_code == 200
