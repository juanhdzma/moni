"""El docroot es web/dist, no la raíz del repo.

Montado en la raíz, StaticFiles servía /backend/data/moni.db (la db viva, que en
Docker es el volumen montado), el código del backend y el .git — todo por HTTP,
sin auth, con un GET.
"""

import re

import pytest

from backend import main

DIST = main.FRONTEND_DIR


@pytest.fixture(scope="module")
def index_html():
    index = DIST / "index.html"
    if not index.is_file():
        pytest.fail(f"Falta {index}: corré `npm run build` en web/ antes de los tests del backend.")
    return index.read_text()


def test_sirve_el_frontend(client, index_html):
    assert client.get("/").status_code == 200
    assert '<div id="root">' in client.get("/").text
    built = re.findall(r'(?:src|href)="(/assets/[^"]+\.(?:js|css))"', index_html)
    assert len(built) >= 2, "index.html no referencia el JS y el CSS hasheados"
    for path in (*built, "/index.html", "/assets/icons/moni.png", "/assets/icons/moni.svg"):
        assert client.get(path).status_code == 200, path


def test_no_sirve_nada_fuera_de_web_dist(client, index_html):
    for path in (
        "/backend/main.py",
        "/backend/db.py",
        "/backend/data/moni.db",
        "/data/moni.db",
        "/CLAUDE.md",
        "/README.md",
        "/.git/config",
        "/docker-compose.yml",
        "/web/package.json",
        "/web/src/main.tsx",
        "/public/index.html",
    ):
        assert client.get(path).status_code == 404, f"{path} sigue siendo accesible"
