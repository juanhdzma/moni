from backend import main
from backend.core.csrf import CSRF_HEADER
from backend.core import db
from backend.seguridad import bloqueo, password
from backend.tests.conftest import CLAVE_TEST, IP_TEST
from backend.tests.seguridad.helpers import login, cliente


def test_tres_fallos_bloquean_aun_con_clave_correcta(anon_client, reloj):
    assert login(anon_client, "a").status_code == 401
    assert login(anon_client, "b").status_code == 401
    assert login(anon_client, "c").status_code == 401
    r = login(anon_client)
    assert r.status_code == 403
    assert r.json()["detail"] == "IP bloqueada" and r.json()["reintentar_en_s"] == 24 * 3600
    assert r.headers["retry-after"] == str(24 * 3600)
    assert anon_client.get("/api/auth/estado").status_code == 403
    assert anon_client.get("/api/backup").status_code == 403
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
        bloqueada = bloqueo.registrar_fallo(Req(), motivo)
    assert bloqueada is True
    assert bloqueo.ip_bloqueada(IP_TEST[0]) > 0
    assert anon_client.get("/api/auth/estado").status_code == 403


def test_ipv6_bloquea_el_64(entorno):
    for i in range(3):
        c = cliente((f"2001:db8:1:2::{i + 1}", 1))
        login(c, "mala")
    assert login(cliente(("2001:db8:1:2:ffff::9", 1))).status_code == 403
    assert login(cliente(("2001:db8:1:3::1", 1))).status_code == 200


def test_metodo_inusual_con_ip_bloqueada(anon_client):
    for _ in range(3):
        login(anon_client, "x")
    for m in ("GET", "HEAD", "OPTIONS", "POST", "DELETE"):
        assert anon_client.request(m, "/API/all").status_code == 403


def test_ráfaga_concurrente_no_evalua_mas_de_3_claves(entorno, monkeypatch):
    import asyncio

    import httpx

    llamadas = []
    original = password.verificar_clave
    monkeypatch.setattr(password, "verificar_clave", lambda c: llamadas.append(c) or original(c))

    async def rafaga():
        transport = httpx.ASGITransport(app=main.app, client=("203.0.113.50", 1))
        async with httpx.AsyncClient(transport=transport, base_url="http://t", headers={CSRF_HEADER: "1"}) as c:
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


def test_respuesta_bloqueada_incluye_texto_legible():
    cuerpo = bloqueo.respuesta_bloqueada(2 * 3600 + 15 * 60 - 20).body
    assert b"Demasiados intentos. Prob\xc3\xa1 de nuevo en 2 h 15 min." in cuerpo
    assert b"1 min" in bloqueo.respuesta_bloqueada(5).body
