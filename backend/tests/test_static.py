"""El docroot es public/, no la raíz del repo.

Montado en la raíz, StaticFiles servía /backend/data/moni.db (la db viva, que en
Docker es el volumen montado), el código del backend y el .git — todo por HTTP,
sin auth, con un GET.
"""


def test_sirve_el_frontend(client):
    assert client.get("/").status_code == 200
    for path in ("/css/tokens.css", "/js/app.js", "/index.html"):
        assert client.get(path).status_code == 200, path


def test_no_sirve_nada_fuera_de_public(client):
    for path in (
        "/backend/main.py",
        "/backend/db.py",
        "/backend/data/moni.db",
        "/data/moni.db",
        "/CLAUDE.md",
        "/README.md",
        "/.git/config",
        "/docker-compose.yml",
    ):
        assert client.get(path).status_code == 404, f"{path} sigue siendo accesible"
