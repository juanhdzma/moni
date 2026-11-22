import datetime

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from backend import auth, db, main
from backend.tests.conftest import CLAVE_TEST, IP_TEST

H = {main.CSRF_HEADER: "1"}
PUBLICAS = {("GET", "/api/auth/estado"), ("POST", "/api/auth/login"),
            ("POST", "/api/auth/passkey/login/opciones"), ("POST", "/api/auth/passkey/login/verificar")}


class Reloj:
    def __init__(self):
        self.t = datetime.datetime(2026, 1, 1, 12, 0, 0, tzinfo=datetime.timezone.utc)

    def __call__(self):
        return self.t

    def avanzar(self, **kw):
        self.t += datetime.timedelta(**kw)


@pytest.fixture
def reloj(monkeypatch):
    r = Reloj()
    monkeypatch.setattr(auth, "ahora", r)
    return r


def login(c, clave=CLAVE_TEST):
    return c.post("/api/auth/login", json={"clave": clave})


def cliente(ip=IP_TEST, **headers):
    c = TestClient(main.app, client=ip)
    c.headers.update({main.CSRF_HEADER: "1", **headers})
    return c


def test_hash_roundtrip(monkeypatch):
    h = auth.hash_clave("otra-clave-larga-1")
    assert h.startswith("scrypt$")
    monkeypatch.setenv("MONI_PASSWORD_HASH", h)
    assert auth.verificar_clave("otra-clave-larga-1")
    assert not auth.verificar_clave("otra-clave-larga-2")


@pytest.mark.parametrize("valor", ["", "basura", "scrypt$x$8$1$AA==$AA==", "bcrypt$1$2$3$AA==$AA==", "scrypt$3$8$1$AA==$AA=="])
def test_hash_invalido_falla_cerrado(anon_client, monkeypatch, valor):
    monkeypatch.setenv("MONI_PASSWORD_HASH", valor)
    assert not auth.configurado()
    assert not auth.verificar_clave(CLAVE_TEST)
    assert login(anon_client).status_code == 503
    assert anon_client.get("/api/all").status_code == 401
    assert anon_client.get("/api/auth/estado").json()["configurado"] is False


def test_sin_hash_nadie_entra(anon_client, client, monkeypatch):
    monkeypatch.delenv("MONI_PASSWORD_HASH")
    r = login(anon_client)
    assert r.status_code == 503 and r.json() == {"detail": "Autenticacion sin configurar"}
    assert client.get("/api/all").status_code == 401
    assert auth.COOKIE not in r.cookies


def test_login_ok_y_cookie(anon_client):
    r = login(anon_client)
    assert r.status_code == 200 and r.json() == {"ok": True}
    sc = r.headers["set-cookie"].lower()
    assert "moni_session=" in sc and "httponly" in sc and "samesite=strict" in sc
    assert "path=/" in sc and f"max-age={30 * 86400}" in sc and "secure" not in sc
    assert anon_client.get("/api/all").status_code == 200
    token = anon_client.cookies.get(auth.COOKIE)
    conn = db.get_conn()
    try:
        filas = conn.execute("SELECT token_hash, metodo FROM sesiones").fetchall()
    finally:
        conn.close()
    assert len(filas) == 1 and filas[0]["metodo"] == "clave"
    assert filas[0]["token_hash"] != token and filas[0]["token_hash"] == auth._hash_token(token)


def test_cookie_secure_en_https_directo_y_con_proxy_confiable(entorno, monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "10.0.0.0/8")
    c = TestClient(main.app, base_url="https://testserver", client=IP_TEST)
    c.headers.update(H)
    assert "secure" in login(c).headers["set-cookie"].lower()
    c2 = cliente(("10.0.0.2", 1), **{"X-Forwarded-Proto": "https", "X-Forwarded-For": "203.0.113.5"})
    r = login(c2)
    assert "secure" in r.headers["set-cookie"].lower()
    assert r.headers.get("strict-transport-security")
    c3 = cliente(IP_TEST, **{"X-Forwarded-Proto": "https"})
    r = login(c3)
    assert "secure" not in r.headers["set-cookie"].lower()
    assert "strict-transport-security" not in r.headers


def test_estado_publico(anon_client):
    r = anon_client.get("/api/auth/estado")
    assert r.json() == {"configurado": True, "autenticado": False, "passkeys": 0, "bloqueada": False}


def test_estado_autenticado(client):
    assert client.get("/api/auth/estado").json()["autenticado"] is True


def test_clave_mala_generica(anon_client):
    r = login(anon_client, "mala")
    assert r.status_code == 401 and r.json() == {"detail": "Credenciales invalidas"}
    assert anon_client.get("/api/all").status_code == 401


def test_clave_valida_longitud(anon_client):
    assert login(anon_client, "").status_code == 422
    assert login(anon_client, "x" * 257).status_code == 422


def test_tres_fallos_bloquean_aun_con_clave_correcta(anon_client, reloj):
    assert login(anon_client, "a").status_code == 401
    assert login(anon_client, "b").status_code == 401
    assert login(anon_client, "c").status_code == 401
    r = login(anon_client)
    assert r.status_code == 403
    assert r.json()["detail"] == "IP bloqueada" and r.json()["reintentar_en_s"] == 24 * 3600
    assert r.headers["retry-after"] == str(24 * 3600)
    assert anon_client.get("/api/auth/estado").status_code == 403
    assert anon_client.get("/api/all").status_code == 403
    otra = cliente(("198.51.100.99", 1))
    assert login(otra).status_code == 200


def test_dos_fallos_no_bloquean(anon_client, reloj):
    login(anon_client, "a")
    login(anon_client, "b")
    assert login(anon_client).status_code == 200


def test_ventana_movil_una_hora(anon_client, reloj):
    login(anon_client, "a")
    reloj.avanzar(minutes=30)
    login(anon_client, "b")
    reloj.avanzar(minutes=31)
    assert login(anon_client, "c").status_code == 401
    assert login(anon_client).status_code == 200


def test_tres_fallos_dentro_de_la_hora_bloquean(anon_client, reloj):
    login(anon_client, "a")
    reloj.avanzar(minutes=30)
    login(anon_client, "b")
    reloj.avanzar(minutes=29)
    login(anon_client, "c")
    assert login(anon_client).status_code == 403


def test_bloqueo_expira_y_decrece(anon_client, reloj, monkeypatch):
    monkeypatch.setenv("MONI_BLOCK_HOURS", "2")
    for _ in range(3):
        login(anon_client, "x")
    reloj.avanzar(hours=1)
    r = login(anon_client)
    assert r.status_code == 403 and r.json()["reintentar_en_s"] == 3600
    reloj.avanzar(hours=1, seconds=1)
    assert login(anon_client).status_code == 200


def test_bloqueo_tras_expirar_vuelve_a_contar_desde_cero(anon_client, reloj, monkeypatch):
    monkeypatch.setenv("MONI_BLOCK_HOURS", "1")
    for _ in range(3):
        login(anon_client, "x")
    reloj.avanzar(hours=1, seconds=1)
    assert login(anon_client, "x").status_code == 401
    assert login(anon_client, "x").status_code == 401
    assert login(anon_client).status_code == 200


def test_login_exitoso_no_borra_fallos(anon_client, reloj):
    login(anon_client, "a")
    login(anon_client, "b")
    assert login(anon_client).status_code == 200
    login(anon_client, "c")
    assert login(anon_client).status_code == 403


def test_fallo_de_otros_motivos_cuenta(anon_client):
    conn = db.get_conn()
    conn.close()

    class Req:
        client = type("C", (), {"host": IP_TEST[0]})()
        headers = type("H", (), {"getlist": lambda self, k: []})()

    for motivo in ("passkey", "push_token", "clave"):
        bloqueada = auth.registrar_fallo(Req(), motivo)
    assert bloqueada is True
    assert auth.ip_bloqueada(IP_TEST[0]) > 0
    assert anon_client.get("/api/auth/estado").status_code == 403


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
    assert auth.client_ip(Req("203.0.113.1", ["8.8.8.8"])) == "203.0.113.1"
    assert auth.client_ip(Req("127.0.0.1", ["8.8.8.8"])) == "8.8.8.8"
    assert auth.client_ip(Req("127.0.0.1", ["10.0.0.5, 192.168.1.1"])) == "192.168.1.1"
    assert auth.client_ip(Req("127.0.0.1", ["basura"])) == "127.0.0.1"
    assert auth.client_ip(Req("127.0.0.1", ["basura, 1.2.3.4"])) == "1.2.3.4"
    assert auth.client_ip(Req("192.168.1.5", ["8.8.8.8"])) == "192.168.1.5"
    assert auth.client_ip(Req("172.17.0.1", ["8.8.8.8"])) == "172.17.0.1"
    assert auth.client_ip(Req("10.0.0.2", ["8.8.8.8"])) == "10.0.0.2"
    assert auth.client_ip(Req("127.0.0.1", ["8.8.8.8", "1.1.1.1, 192.168.0.4"])) == "192.168.0.4"
    assert auth.client_ip(Req("127.0.0.1")) == "127.0.0.1"
    assert auth.client_ip(Req(None)) == "desconocida"
    assert auth.client_ip(Req("2001:db8:1:2:aaaa:bbbb:cccc:dddd")) == "2001:db8:1:2::/64"
    assert auth.client_ip(Req("::ffff:203.0.113.9")) == "203.0.113.9"
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "203.0.113.0/24")
    assert auth.client_ip(Req("203.0.113.1", ["8.8.8.8"])) == "8.8.8.8"
    assert auth.client_ip(Req("127.0.0.1", ["8.8.8.8"])) == "127.0.0.1"
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "no-es-cidr")
    assert auth.client_ip(Req("127.0.0.1", ["8.8.8.8"])) == "127.0.0.1"


def test_ipv6_bloquea_el_64(entorno):
    for i in range(3):
        c = cliente((f"2001:db8:1:2::{i + 1}", 1))
        login(c, "mala")
    assert login(cliente(("2001:db8:1:2:ffff::9", 1))).status_code == 403
    assert login(cliente(("2001:db8:1:3::1", 1))).status_code == 200


def test_sesion_expirada(anon_client, reloj):
    login(anon_client)
    assert anon_client.get("/api/all").status_code == 200
    reloj.avanzar(days=29, hours=23)
    assert anon_client.get("/api/all").status_code == 200
    reloj.avanzar(hours=2)
    assert anon_client.get("/api/all").status_code == 401
    conn = db.get_conn()
    try:
        assert conn.execute("SELECT COUNT(*) FROM sesiones").fetchone()[0] == 0
    finally:
        conn.close()


def test_expiracion_absoluta_aunque_se_use(anon_client, reloj):
    login(anon_client)
    for _ in range(29):
        reloj.avanzar(days=1)
        assert anon_client.get("/api/all").status_code == 200
    reloj.avanzar(days=1, hours=1)
    assert anon_client.get("/api/all").status_code == 401


def test_ultimo_uso_se_actualiza(anon_client, reloj):
    login(anon_client)
    reloj.avanzar(minutes=10)
    anon_client.get("/api/all")
    conn = db.get_conn()
    try:
        fila = conn.execute("SELECT creada, ultimo_uso FROM sesiones").fetchone()
    finally:
        conn.close()
    assert fila["ultimo_uso"] > fila["creada"]


def test_cookie_falsa_o_manipulada(anon_client):
    for valor in ("", "x", "a" * 500, "token_inexistente_" + "z" * 30):
        anon_client.cookies.clear()
        anon_client.cookies.set(auth.COOKIE, valor)
        assert anon_client.get("/api/all").status_code == 401


def test_logout(anon_client):
    login(anon_client)
    token = anon_client.cookies.get(auth.COOKIE)
    r = anon_client.post("/api/auth/logout")
    assert r.status_code == 200 and r.json() == {"ok": True}
    assert "moni_session=" in r.headers["set-cookie"]
    assert "max-age=0" in r.headers["set-cookie"].lower()
    anon_client.cookies.set(auth.COOKIE, token)
    assert anon_client.get("/api/all").status_code == 401


def test_logout_sin_sesion(anon_client):
    assert anon_client.post("/api/auth/logout").status_code == 401


def test_logout_exige_csrf(anon_client):
    login(anon_client)
    del anon_client.headers[main.CSRF_HEADER]
    assert anon_client.post("/api/auth/logout").status_code == 403


def test_listar_y_revocar_sesiones(anon_client):
    otra = cliente()
    login(otra)
    login(anon_client)
    lista = anon_client.get("/api/auth/sesiones").json()
    assert len(lista) == 2
    actual = [s for s in lista if s["actual"]]
    assert len(actual) == 1
    assert set(actual[0]) == {"id", "creada", "ultimo_uso", "ip", "user_agent", "metodo", "actual"}
    ajena = next(s for s in lista if not s["actual"])
    assert anon_client.delete(f"/api/auth/sesiones/{actual[0]['id']}").status_code == 400
    assert anon_client.delete(f"/api/auth/sesiones/{ajena['id']}").status_code == 200
    assert anon_client.delete(f"/api/auth/sesiones/{ajena['id']}").status_code == 404
    assert otra.get("/api/all").status_code == 401
    assert anon_client.get("/api/all").status_code == 200


def test_sesiones_exigen_sesion(anon_client):
    assert anon_client.get("/api/auth/sesiones").status_code == 401
    assert anon_client.delete("/api/auth/sesiones/1").status_code == 401


def test_sesion_invalida_si_se_quita_la_config(client, monkeypatch):
    assert client.get("/api/all").status_code == 200
    monkeypatch.delenv("MONI_PASSWORD_HASH")
    assert client.get("/api/all").status_code == 401


def _rutas_api():
    for r in main.app.routes:
        if isinstance(r, APIRoute):
            for m in r.methods - {"HEAD"}:
                yield m, r.path


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
    anon_client.cookies.set(auth.COOKIE, "nope")
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
    abiertas = auth.PUBLICAS
    assert abiertas == PUBLICAS


@pytest.mark.parametrize(
    "metodo,path",
    [
        ("GET", "//api/all"),
        ("GET", "///api/all"),
        ("GET", "/API/all"),
        ("GET", "/Api/ALL"),
        ("GET", "/api/all/"),
        ("GET", "/api/auth/estado/../all"),
        ("GET", "/api/auth/../all"),
        ("GET", "/api/./all"),
        ("GET", "/api//all"),
        ("GET", "/api/auth/estado/"),
        ("GET", "/api/auth/ESTADO"),
        ("GET", "/api/auth//estado"),
        ("GET", "/api/auth/estado/extra"),
        ("HEAD", "/api/all"),
        ("OPTIONS", "/api/all"),
        ("PATCH", "/api/all"),
        ("TRACE", "/api/all"),
        ("HEAD", "/api/auth/estado"),
        ("POST", "/api/truncate"),
        ("GET", "/api/%61ll"),
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


@pytest.mark.parametrize("path", ["//api/all", "///api/all", "/api/auth/estado/../all", "/api/auth/./../all", "/API//all/", "/api/auth/estado/../../api/all"])
def test_path_tricks_asgi_crudo(entorno, path):
    with TestClient(main.app):
        assert asgi(path) == 401
        assert asgi(path, "POST") == 401
        assert asgi(path, "HEAD") == 401


def test_metodo_inusual_con_ip_bloqueada(anon_client):
    for _ in range(3):
        login(anon_client, "x")
    for m in ("GET", "HEAD", "OPTIONS", "POST", "DELETE"):
        assert anon_client.request(m, "/API/all").status_code == 403


def test_docs_desactivados(client, anon_client):
    for c in (client, anon_client):
        for p in ("/docs", "/redoc", "/openapi.json", "/api/openapi.json", "/api/docs"):
            assert c.get(p).status_code in (401, 404), p
    assert main.app.openapi_url is None and main.app.docs_url is None and main.app.redoc_url is None


def test_headers_de_seguridad(client, anon_client):
    for r in (client.get("/api/all"), anon_client.get("/api/all"), anon_client.get("/"), anon_client.get("/api/auth/estado")):
        h = r.headers
        assert "default-src 'self'" in h["content-security-policy"]
        assert "frame-ancestors 'none'" in h["content-security-policy"]
        assert "script-src 'self'" in h["content-security-policy"]
        assert h["x-frame-options"] == "DENY"
        assert h["x-content-type-options"] == "nosniff"
        assert h["referrer-policy"] == "no-referrer"
        assert "camera=()" in h["permissions-policy"]
        assert "strict-transport-security" not in h
    assert client.get("/api/all").headers["cache-control"] == "no-store"
    assert anon_client.get("/api/all").headers["cache-control"] == "no-store"
    assert anon_client.get("/").headers.get("cache-control") != "no-store"


def test_bearer_push_invalido_cuenta_fallo(anon_client, monkeypatch):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "t" * 40)
    for _ in range(3):
        r = anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}, headers={"Authorization": "Bearer mal"})
        assert r.status_code == 401
    assert anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}).status_code == 403


def test_bearer_push_sin_token_configurado_falla_cerrado(anon_client, monkeypatch):
    monkeypatch.delenv("MONI_PUSH_TOKEN", raising=False)
    r = anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}, headers={"Authorization": "Bearer " + "t" * 40})
    assert r.status_code == 401


def test_bearer_push_corto_se_rechaza(anon_client, monkeypatch):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "corto")
    r = anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}, headers={"Authorization": "Bearer corto"})
    assert r.status_code == 401


def test_bearer_no_abre_otras_rutas(anon_client, monkeypatch):
    token = "t" * 40
    monkeypatch.setenv("MONI_PUSH_TOKEN", token)
    h = {"Authorization": f"Bearer {token}"}
    for p in ("/api/all", "/api/push/test", "/api/truncate"):
        assert anon_client.request("POST" if p != "/api/all" else "GET", p, headers=h).status_code == 401


def test_bearer_valido_llega_a_la_ruta(anon_client, monkeypatch):
    token = "t" * 40
    monkeypatch.setenv("MONI_PUSH_TOKEN", token)
    r = anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code != 401 and r.status_code != 403


def test_cli_blocked_y_unblock(anon_client, capsys):
    for _ in range(3):
        login(anon_client, "x")
    assert auth.main(["blocked"]) == 0
    assert IP_TEST[0] in capsys.readouterr().out
    assert auth.main(["unblock", IP_TEST[0]]) == 0
    assert "desbloqueada" in capsys.readouterr().out
    assert login(anon_client).status_code == 200
    assert auth.main(["blocked"]) == 0
    assert "Sin IPs" in capsys.readouterr().out


def test_cli_unblock_reinicia_el_conteo(anon_client):
    for _ in range(3):
        login(anon_client, "x")
    auth.main(["unblock", IP_TEST[0]])
    assert login(anon_client, "x").status_code == 401
    assert login(anon_client, "x").status_code == 401
    assert login(anon_client).status_code == 200


def test_cli_hash(monkeypatch, capsys):
    claves = iter(["una-clave-muy-larga-1", "una-clave-muy-larga-1"])
    monkeypatch.setattr(auth.getpass, "getpass", lambda _: next(claves))
    assert auth.main(["hash"]) == 0
    linea = capsys.readouterr().out.strip()
    assert linea.startswith("MONI_PASSWORD_HASH='scrypt$")
    monkeypatch.setenv("MONI_PASSWORD_HASH", linea.split("=", 1)[1])
    assert auth.verificar_clave("una-clave-muy-larga-1")


def test_cli_hash_rechaza_corta_y_distinta(monkeypatch, capsys):
    monkeypatch.setattr(auth.getpass, "getpass", lambda _: "corta")
    assert auth.main(["hash"]) == 1
    claves = iter(["una-clave-muy-larga-1", "otra-clave-muy-larga-2"])
    monkeypatch.setattr(auth.getpass, "getpass", lambda _: next(claves))
    assert auth.main(["hash"]) == 1


def test_cli_uso(capsys):
    assert auth.main([]) == 2
    assert auth.main(["unblock"]) == 2


def test_hash_con_comillas_en_env_funciona(anon_client, monkeypatch):
    import os

    monkeypatch.setenv("MONI_PASSWORD_HASH", "'" + os.environ["MONI_PASSWORD_HASH"] + "'")
    assert login(anon_client).status_code == 200


def test_la_clave_no_se_loguea(anon_client, caplog):
    caplog.set_level("DEBUG")
    login(anon_client, "super-secreta-mala")
    login(anon_client)
    assert "super-secreta-mala" not in caplog.text and CLAVE_TEST not in caplog.text
    assert anon_client.cookies.get(auth.COOKIE) not in caplog.text


@pytest.mark.parametrize("peer", ["172.17.0.1", "192.168.1.20", "10.0.0.2"])
def test_xff_rotando_desde_peer_privado_no_evade_el_bloqueo(entorno, peer):
    codigos = [login(cliente((peer, 1), **{"X-Forwarded-For": f"7.7.7.{i}"}), "mala").status_code for i in range(5)]
    assert codigos == [401, 401, 401, 403, 403]


def test_ráfaga_concurrente_no_evalua_mas_de_3_claves(entorno, monkeypatch):
    import asyncio

    import httpx

    llamadas = []
    original = auth.verificar_clave
    monkeypatch.setattr(auth, "verificar_clave", lambda c: llamadas.append(c) or original(c))

    async def rafaga():
        transport = httpx.ASGITransport(app=main.app, client=("203.0.113.50", 1))
        async with httpx.AsyncClient(transport=transport, base_url="http://t", headers={main.CSRF_HEADER: "1"}) as c:
            rs = await asyncio.gather(*[c.post("/api/auth/login", json={"clave": f"mala-{i}"}) for i in range(30)])
            ok = await c.post("/api/auth/login", json={"clave": CLAVE_TEST})
        return [r.status_code for r in rs], ok.status_code

    codigos, ok = asyncio.run(rafaga())
    assert len(llamadas) == 3
    assert codigos.count(401) == 3 and codigos.count(403) == 27
    assert ok == 403


def test_bloqueo_poda_bloqueos_vencidos_y_borra_intentos(entorno, reloj, monkeypatch):
    monkeypatch.setenv("MONI_BLOCK_HOURS", "0.5")
    c = cliente(("203.0.113.70", 1))
    for _ in range(3):
        login(c, "x")
    conn = db.get_conn()
    assert conn.execute("SELECT COUNT(*) FROM intentos_fallidos").fetchone()[0] == 0
    conn.close()
    reloj.avanzar(minutes=31)
    assert login(c, "x").status_code == 401
    assert login(cliente(("203.0.113.71", 1)), "x").status_code == 401
    conn = db.get_conn()
    assert conn.execute("SELECT COUNT(*) FROM ips_bloqueadas").fetchone()[0] == 0
    conn.close()
