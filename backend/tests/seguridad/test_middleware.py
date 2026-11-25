import pytest
from fastapi.testclient import TestClient

from backend import main
from backend.core import db
from backend.seguridad import bloqueo, middleware, sesiones
from backend.tests.conftest import IP_TEST
PUBLICAS = {("GET", "/api/auth/estado"), ("POST", "/api/auth/login"),
            ("POST", "/api/auth/passkey/login/opciones"), ("POST", "/api/auth/passkey/login/verificar")}


def _rutas_api():
    for path, metodos in main.app.openapi()["paths"].items():
        for m in metodos:
            yield m.upper(), path


def _ejemplo(path):
    import re

    return re.sub(r"\{[^}]+\}", "1", path)


def test_todas_las_rutas_protegidas_sin_sesion(anon_client):
    vistas = 0
    for metodo, path in _rutas_api():
        if (metodo, path) in PUBLICAS:
            continue
        r = anon_client.request(metodo, _ejemplo(path), json={} if metodo in ("POST", "PUT", "PATCH") else None)
        assert r.status_code == 401, (metodo, path, r.status_code)
        vistas += 1
    assert vistas > 30


def test_todas_las_rutas_protegidas_con_cookie_invalida(anon_client):
    anon_client.cookies.set(sesiones.COOKIE, "nope")
    for metodo, path in _rutas_api():
        if (metodo, path) in PUBLICAS:
            continue
        assert anon_client.request(metodo, _ejemplo(path), json={}).status_code == 401, (metodo, path)


def test_todas_las_rutas_protegidas_sin_hash_aun_con_cookie(client, monkeypatch):
    monkeypatch.delenv("MONI_PASSWORD_HASH")
    for metodo, path in _rutas_api():
        if (metodo, path) in PUBLICAS:
            continue
        assert client.request(metodo, _ejemplo(path), json={}).status_code == 401, (metodo, path)


def test_solo_las_publicas_declaradas_estan_abiertas():
    rutas = {(m, p) for m, p in _rutas_api() if p.startswith("/api/auth/") or "passkey" in p}
    assert PUBLICAS >= {(m, p) for m, p in rutas if (m, p) in PUBLICAS}
    abiertas = middleware.PUBLICAS
    assert abiertas == PUBLICAS


@pytest.mark.parametrize(
    "metodo,path",
    [
        ("GET", "//api/meta"),
        ("GET", "///api/meta"),
        ("GET", "/API/meta"),
        ("GET", "/Api/META"),
        ("GET", "/api/meta/"),
        ("GET", "/api/auth/estado/../meta"),
        ("GET", "/api/auth/../meta"),
        ("GET", "/api/./meta"),
        ("GET", "/api//meta"),
        ("GET", "/api/auth/estado/"),
        ("GET", "/api/auth/ESTADO"),
        ("GET", "/api/auth//estado"),
        ("GET", "/api/auth/estado/extra"),
        ("HEAD", "/api/meta"),
        ("OPTIONS", "/api/meta"),
        ("PATCH", "/api/meta"),
        ("TRACE", "/api/meta"),
        ("HEAD", "/api/auth/estado"),
        ("POST", "/api/truncate"),
        ("GET", "/api/%6deta"),
        ("GET", "/api"),
        ("GET", "/api/"),
        ("GET", "/apix/all"),
        ("POST", "/api/auth/logout/"),
    ],
)
def test_path_tricks(anon_client, metodo, path):
    r = anon_client.request(metodo, path)
    assert r.status_code in (401, 404, 405, 307, 308) and "ingresos" not in r.text
    if r.status_code in (307, 308):
        sigue = anon_client.request(metodo, r.headers["location"])
        assert sigue.status_code in (401, 404, 405)
    assert r.status_code != 200 or path.lower().rstrip("/") == "/api/auth/estado"


def asgi(path, metodo="GET"):
    import asyncio

    out = {}

    async def run():
        scope = {"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": metodo, "scheme": "http",
                 "path": path, "raw_path": path.encode(), "query_string": b"", "headers": [(b"host", b"t")],
                 "client": IP_TEST, "server": ("t", 80)}

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(m):
            if m["type"] == "http.response.start":
                out["status"] = m["status"]

        await main.app(scope, receive, send)

    asyncio.run(run())
    return out["status"]


@pytest.mark.parametrize("path", ["//api/meta", "///api/meta", "/api/auth/estado/../meta", "/api/auth/./../meta", "/API//meta/", "/api/auth/estado/../../api/meta"])
def test_path_tricks_asgi_crudo(entorno, path):
    with TestClient(main.app):
        assert asgi(path) == 401
        assert asgi(path, "POST") == 401
        assert asgi(path, "HEAD") == 401


def test_docs_desactivados(client, anon_client):
    for c in (client, anon_client):
        for p in ("/docs", "/redoc", "/openapi.json", "/api/openapi.json", "/api/docs"):
            assert c.get(p).status_code in (401, 404), p
    assert main.app.openapi_url is None and main.app.docs_url is None and main.app.redoc_url is None


def test_headers_de_seguridad(client, anon_client):
    for r in (client.get("/api/meta"), anon_client.get("/api/meta"), anon_client.get("/"), anon_client.get("/api/auth/estado")):
        h = r.headers
        assert "default-src 'self'" in h["content-security-policy"]
        assert "frame-ancestors 'none'" in h["content-security-policy"]
        assert "script-src 'self'" in h["content-security-policy"]
        assert h["x-frame-options"] == "DENY"
        assert h["x-content-type-options"] == "nosniff"
        assert h["referrer-policy"] == "no-referrer"
        assert "camera=()" in h["permissions-policy"]
        assert "strict-transport-security" not in h
    assert client.get("/api/meta").headers["cache-control"] == "no-store"
    assert anon_client.get("/api/meta").headers["cache-control"] == "no-store"
    assert anon_client.get("/").headers.get("cache-control") != "no-store"


def test_401_del_middleware_trae_el_cuerpo_exacto(anon_client):
    r = anon_client.get("/api/backup")
    assert r.status_code == 401 and r.json() == {"detail": "No autenticado"}
    assert anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}).json() == {"detail": "No autenticado"}


def test_bearer_sin_token_configurado_es_401_y_cuenta_fallo(anon_client):
    r = anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}, headers={"Authorization": "Bearer " + "x" * 40})
    assert r.status_code == 401 and r.json() == {"detail": "Credenciales inválidas"}
    conn = db.get_conn()
    assert conn.execute("SELECT motivo FROM intentos_fallidos").fetchall()[0][0] == "push_token"
    conn.close()


def test_rafaga_concurrente_de_bearer_malos_evalua_solo_3_antes_de_bloquear(entorno, monkeypatch):
    import asyncio

    import httpx

    from backend.core.csrf import CSRF_HEADER

    monkeypatch.setenv("MONI_PUSH_TOKEN", "t" * 40)
    monkeypatch.setattr(bloqueo, "RETRASO_FALLO", 0.01)

    async def rafaga():
        transport = httpx.ASGITransport(app=main.app, client=("203.0.113.50", 1))
        async with httpx.AsyncClient(transport=transport, base_url="http://t", headers={CSRF_HEADER: "1"}) as c:
            envios = [c.post("/api/push/enviar", json={"title": "a", "body": ""}, headers={"Authorization": "Bearer " + "x" * 40}) for _ in range(30)]
            return [r.status_code for r in await asyncio.gather(*envios)]

    codigos = asyncio.run(rafaga())
    assert codigos.count(401) == 3 and codigos.count(403) == 27
