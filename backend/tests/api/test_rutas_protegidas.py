import re

import pytest

from backend.main import app
from backend.seguridad.middleware import PUBLICAS

METODOS = {"get", "post", "put", "delete", "patch"}
PUBLICAS_ESPERADAS = {
    ("GET", "/api/auth/estado"),
    ("POST", "/api/auth/login"),
    ("POST", "/api/auth/passkey/login/opciones"),
    ("POST", "/api/auth/passkey/login/verificar"),
}


def _rutas_api():
    for path, metodos in app.openapi()["paths"].items():
        if path.startswith("/api"):
            for metodo in metodos:
                if metodo in METODOS:
                    yield metodo.upper(), re.sub(r"\{[^}]+\}", "1", path)


def _protegidas():
    return sorted(r for r in _rutas_api() if r not in PUBLICAS_ESPERADAS)


def test_la_lista_blanca_publica_es_la_esperada():
    assert PUBLICAS == PUBLICAS_ESPERADAS
    assert PUBLICAS_ESPERADAS <= set(_rutas_api())


@pytest.mark.parametrize("metodo,path", _protegidas())
def test_ruta_api_sin_sesion_responde_401(anon_client, metodo, path):
    r = anon_client.request(metodo, path, json={})
    assert r.status_code == 401, f"{metodo} {path} responde {r.status_code} sin sesion"
    assert r.json() == {"detail": "No autenticado"}


def test_ruta_api_inexistente_sin_sesion_tambien_es_401(anon_client):
    assert anon_client.get("/api/no-existe").status_code == 401
