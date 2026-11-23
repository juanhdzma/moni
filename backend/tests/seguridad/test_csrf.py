import re

import pytest

from backend.core.csrf import CSRF_HEADER
from backend.main import app


def _mutantes():
    for path, metodos in app.openapi()["paths"].items():
        if not path.startswith("/api"):
            continue
        for metodo in metodos:
            if metodo.upper() in {"POST", "PUT", "DELETE"}:
                yield metodo.upper(), re.sub(r"\{[^}]+\}", "1", path)


@pytest.mark.parametrize("metodo,path", sorted(_mutantes()))
def test_mutacion_sin_header_es_rechazada(client, metodo, path):
    del client.headers[CSRF_HEADER]
    r = client.request(metodo, path, json={})
    assert r.status_code == 403
    assert CSRF_HEADER in r.json()["detail"]


def test_lectura_no_necesita_header(client):
    del client.headers[CSRF_HEADER]
    assert client.get("/api/meta").status_code == 200
