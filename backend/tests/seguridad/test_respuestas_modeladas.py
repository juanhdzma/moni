import json
import subprocess
import sys

import pytest

from backend.main import app

METODOS = {"get", "post", "put", "delete"}


def _respuestas_exitosas():
    for path, metodos in app.openapi()["paths"].items():
        if not path.startswith("/api"):
            continue
        for metodo, operacion in metodos.items():
            if metodo not in METODOS:
                continue
            exito = [(codigo, r) for codigo, r in operacion["responses"].items() if codigo.startswith("2")]
            yield metodo.upper(), path, exito


@pytest.mark.parametrize("metodo,path,exito", sorted(_respuestas_exitosas(), key=lambda x: x[:2]))
def test_ruta_declara_respuesta_modelada(metodo, path, exito):
    assert exito, f"{metodo} {path} no declara respuesta 2xx"
    for codigo, respuesta in exito:
        if codigo == "204":
            assert "content" not in respuesta
            continue
        esquema = respuesta["content"]["application/json"]["schema"]
        assert esquema != {}, f"{metodo} {path} responde sin modelo"


def test_python_m_backend_openapi_imprime_el_spec():
    salida = subprocess.run(
        [sys.executable, "-m", "backend.openapi"], capture_output=True, text=True, check=True
    ).stdout
    assert json.loads(salida)["paths"].keys() == app.openapi()["paths"].keys()
