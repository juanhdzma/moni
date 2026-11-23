from fastapi.testclient import TestClient

from backend import main
from backend.core import db
from backend.seguridad import sesiones
from backend.tests.conftest import IP_TEST
from backend.tests.seguridad.helpers import login, cliente, H


def test_login_ok_y_cookie(anon_client):
    r = login(anon_client)
    assert r.status_code == 200 and r.json() == {"ok": True}
    sc = r.headers["set-cookie"].lower()
    assert "moni_session=" in sc and "httponly" in sc and "samesite=strict" in sc
    assert "path=/" in sc and f"max-age={30 * 86400}" in sc and "secure" not in sc
    assert anon_client.get("/api/backup").status_code == 200
    token = anon_client.cookies.get(sesiones.COOKIE)
    conn = db.get_conn()
    try:
        filas = conn.execute("SELECT token_hash, metodo FROM sesiones").fetchall()
    finally:
        conn.close()
    assert len(filas) == 1 and filas[0]["metodo"] == "clave"
    assert filas[0]["token_hash"] != token and filas[0]["token_hash"] == sesiones.hash_token(token)


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
    assert r.json() == {"configurado": True, "autenticado": False, "passkeys": 0}


def test_estado_autenticado(client):
    assert client.get("/api/auth/estado").json()["autenticado"] is True


def test_logout(anon_client):
    login(anon_client)
    token = anon_client.cookies.get(sesiones.COOKIE)
    r = anon_client.post("/api/auth/logout")
    assert r.status_code == 200 and r.json() == {"ok": True}
    assert "moni_session=" in r.headers["set-cookie"]
    assert "max-age=0" in r.headers["set-cookie"].lower()
    anon_client.cookies.set(sesiones.COOKIE, token)
    assert anon_client.get("/api/backup").status_code == 401


def test_logout_sin_sesion(anon_client):
    assert anon_client.post("/api/auth/logout").status_code == 401



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
    assert otra.get("/api/backup").status_code == 401
    assert anon_client.get("/api/backup").status_code == 200


def test_sesiones_exigen_sesion(anon_client):
    assert anon_client.get("/api/auth/sesiones").status_code == 401
    assert anon_client.delete("/api/auth/sesiones/1").status_code == 401
