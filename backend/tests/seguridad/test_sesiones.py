import datetime
from http.cookies import SimpleCookie
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend import main
from backend.core import db
from backend.seguridad import sesiones, tiempo
from backend.tests.conftest import IP_TEST
from backend.tests.seguridad.helpers import H, cliente, login


def usar_cada_seis_dias(client, reloj, dias):
    for _ in range(dias // 6):
        reloj.avanzar(days=6)
        assert client.get("/api/backup").status_code == 200


def test_sesion_expirada(anon_client, reloj):
    login(anon_client)
    assert anon_client.get("/api/backup").status_code == 200
    usar_cada_seis_dias(anon_client, reloj, 24)
    reloj.avanzar(days=5, hours=23)
    assert anon_client.get("/api/backup").status_code == 200
    reloj.avanzar(hours=2)
    assert anon_client.get("/api/backup").status_code == 401
    conn = db.get_conn()
    try:
        assert conn.execute("SELECT COUNT(*) FROM sesiones").fetchone()[0] == 0
    finally:
        conn.close()


def test_sesion_inactiva_por_siete_dias(anon_client, reloj):
    login(anon_client)
    reloj.avanzar(days=6, hours=23)
    assert anon_client.get("/api/backup").status_code == 200
    reloj.avanzar(days=6, hours=23)
    assert anon_client.get("/api/backup").status_code == 200
    reloj.avanzar(days=7, hours=1)
    assert anon_client.get("/api/backup").status_code == 401
    conn = db.get_conn()
    try:
        assert conn.execute("SELECT COUNT(*) FROM sesiones").fetchone()[0] == 0
    finally:
        conn.close()


def test_expiracion_absoluta_aunque_se_use(anon_client, reloj):
    login(anon_client)
    for _ in range(29):
        reloj.avanzar(days=1)
        assert anon_client.get("/api/backup").status_code == 200
    reloj.avanzar(days=1, hours=1)
    assert anon_client.get("/api/backup").status_code == 401


def test_ultimo_uso_se_actualiza(anon_client, reloj):
    login(anon_client)
    reloj.avanzar(minutes=10)
    anon_client.get("/api/backup")
    conn = db.get_conn()
    try:
        fila = conn.execute("SELECT creada, ultimo_uso FROM sesiones").fetchone()
    finally:
        conn.close()
    assert fila["ultimo_uso"] > fila["creada"]


def test_cookie_falsa_o_manipulada(anon_client):
    for valor in ("", "x", "a" * 500, "token_inexistente_" + "z" * 30):
        anon_client.cookies.clear()
        anon_client.cookies.set(sesiones.COOKIE, valor)
        assert anon_client.get("/api/backup").status_code == 401


def _fijar(**columnas):
    conn = db.get_conn()
    try:
        sets = ", ".join(f"{k} = ?" for k in columnas)
        conn.execute(f"UPDATE sesiones SET {sets}", tuple(columnas.values()))
        conn.commit()
    finally:
        conn.close()


def _fila():
    conn = db.get_conn()
    try:
        return dict(conn.execute("SELECT * FROM sesiones").fetchone())
    finally:
        conn.close()


def _cookie(respuesta):
    return SimpleCookie(respuesta.headers["set-cookie"])[sesiones.COOKIE]


def test_expira_exactamente_ahora_ya_no_vale(anon_client, reloj):
    login(anon_client)
    _fijar(expira=tiempo.iso(reloj()), ultimo_uso=tiempo.iso(reloj()))
    assert anon_client.get("/api/backup").status_code == 401


def test_expira_un_segundo_despues_todavia_vale(anon_client, reloj):
    login(anon_client)
    _fijar(expira=tiempo.iso(reloj() + datetime.timedelta(seconds=1)), ultimo_uso=tiempo.iso(reloj()))
    assert anon_client.get("/api/backup").status_code == 200


def test_ultimo_uso_hace_exactamente_siete_dias_ya_no_vale_y_se_borra(anon_client, reloj):
    login(anon_client)
    _fijar(ultimo_uso=tiempo.iso(reloj() - datetime.timedelta(days=sesiones.INACTIVIDAD_DIAS)))
    assert anon_client.get("/api/backup").status_code == 401
    conn = db.get_conn()
    assert conn.execute("SELECT COUNT(*) FROM sesiones").fetchone()[0] == 0
    conn.close()


def test_ultimo_uso_un_segundo_dentro_de_siete_dias_todavia_vale(anon_client, reloj):
    login(anon_client)
    _fijar(ultimo_uso=tiempo.iso(reloj() - datetime.timedelta(days=sesiones.INACTIVIDAD_DIAS) + datetime.timedelta(seconds=1)))
    assert anon_client.get("/api/backup").status_code == 200


def test_ultimo_uso_se_refresca_a_los_60_segundos_exactos(anon_client, reloj):
    login(anon_client)
    hace_60 = tiempo.iso(reloj() - datetime.timedelta(seconds=60))
    _fijar(ultimo_uso=hace_60)
    anon_client.get("/api/backup")
    assert _fila()["ultimo_uso"] == tiempo.iso(reloj())


def test_ultimo_uso_no_se_refresca_antes_de_60_segundos(anon_client, reloj):
    login(anon_client)
    hace_59 = tiempo.iso(reloj() - datetime.timedelta(seconds=59))
    _fijar(ultimo_uso=hace_59)
    anon_client.get("/api/backup")
    assert _fila()["ultimo_uso"] == hace_59


def test_la_sesion_devuelta_trae_el_ultimo_uso_refrescado_y_sin_columna_vigente(anon_client, reloj):
    login(anon_client)
    _fijar(ultimo_uso=tiempo.iso(reloj() - datetime.timedelta(minutes=5)))
    request = SimpleNamespace(state=SimpleNamespace(), cookies={sesiones.COOKIE: anon_client.cookies.get(sesiones.COOKIE)})
    sesion = sesiones.requiere_sesion(request)
    assert sesion["ultimo_uso"] == tiempo.iso(reloj())
    assert "vigente" not in sesion and sesion["metodo"] == "clave"
    assert request.state.sesion is sesion


def test_requiere_sesion_cachea_en_request_state_incluso_el_no():
    request = SimpleNamespace(state=SimpleNamespace(), cookies={})
    assert sesiones.requiere_sesion(request) is None
    assert request.state.sesion is None
    request.state.sesion = {"id": 7}
    assert sesiones.requiere_sesion(request) == {"id": 7}


def test_token_valido_sin_hash_configurado_no_autentica(client, monkeypatch):
    assert client.get("/api/auth/estado").json()["autenticado"] is True
    monkeypatch.delenv("MONI_PASSWORD_HASH")
    assert client.get("/api/auth/estado").json() == {"configurado": False, "autenticado": False, "tiene_passkeys": False}
    request = SimpleNamespace(state=SimpleNamespace(), cookies={sesiones.COOKIE: client.cookies.get(sesiones.COOKIE)})
    assert sesiones.requiere_sesion(request) is None


def test_cookie_de_128_caracteres_se_evalua_y_de_129_se_descarta_sin_tocar_la_db(entorno, monkeypatch):
    consultas = []
    original = sesiones.hash_token
    monkeypatch.setattr(sesiones, "hash_token", lambda t: consultas.append(len(t)) or original(t))
    for largo in (128, 129):
        request = SimpleNamespace(state=SimpleNamespace(), cookies={sesiones.COOKIE: "a" * largo})
        assert sesiones.requiere_sesion(request) is None
    assert consultas == [128]


def test_sesion_obligatoria_sin_sesion_lanza_401_no_autenticado():
    request = SimpleNamespace(state=SimpleNamespace(), cookies={})
    with pytest.raises(HTTPException) as e:
        sesiones.sesion_obligatoria(request)
    assert e.value.status_code == 401 and e.value.detail == "No autenticado"


def test_atributos_exactos_de_la_cookie_de_login(anon_client):
    c = _cookie(login(anon_client))
    assert len(c.value) == 43
    assert c["path"] == "/"
    assert c["httponly"] is True
    assert c["samesite"] == "strict"
    assert c["max-age"] == str(30 * 86400)
    assert c["secure"] == ""
    assert c["domain"] == ""


def test_cookie_de_login_secure_bajo_https(entorno):
    c = TestClient(main.app, base_url="https://testserver", client=IP_TEST)
    c.headers.update(H)
    assert _cookie(login(c))["secure"] is True


def test_la_fila_de_sesion_guarda_vigencia_ip_agente_y_metodo(anon_client, reloj):
    anon_client.headers["user-agent"] = "U" * 300
    login(anon_client)
    fila = _fila()
    assert fila["creada"] == fila["ultimo_uso"] == "2026-01-01T12:00:00"
    assert fila["expira"] == "2026-01-31T12:00:00"
    assert fila["ip"] == IP_TEST[0]
    assert fila["user_agent"] == "U" * 200
    assert fila["metodo"] == "clave"


def test_atributos_exactos_de_la_cookie_de_logout(anon_client):
    login(anon_client)
    c = _cookie(anon_client.post("/api/auth/logout"))
    assert c.value == ""
    assert c["path"] == "/"
    assert c["httponly"] is True
    assert c["samesite"] == "strict"
    assert c["max-age"] == "0"
    assert c["expires"]
    assert c["secure"] == ""


def test_cookie_de_logout_secure_bajo_https(entorno):
    c = TestClient(main.app, base_url="https://testserver", client=IP_TEST)
    c.headers.update(H)
    login(c)
    assert _cookie(c.post("/api/auth/logout"))["secure"] is True


def test_logout_borra_solo_la_sesion_actual(anon_client):
    otra = cliente()
    login(otra)
    login(anon_client)
    anon_client.post("/api/auth/logout")
    conn = db.get_conn()
    assert conn.execute("SELECT COUNT(*) FROM sesiones").fetchone()[0] == 1
    conn.close()
    assert otra.get("/api/backup").status_code == 200


def test_borrar_sesion_devuelve_cuantas_filas_borro(anon_client):
    login(anon_client)
    sid = _fila()["id"]
    assert sesiones.borrar_sesion(sid) == 1
    assert sesiones.borrar_sesion(sid) == 0


def _request_sin_user_agent():
    from starlette.requests import Request

    scope = {"type": "http", "method": "POST", "path": "/", "headers": [], "scheme": "http", "server": ("t", 80),
             "query_string": b"", "client": IP_TEST}
    return Request(scope)


def test_crear_sesion_sin_user_agent_guarda_vacio_y_devuelve_el_id(entorno):
    from fastapi.responses import JSONResponse

    sesion_id = sesiones.crear_sesion(_request_sin_user_agent(), JSONResponse({}), "passkey")
    fila = _fila()
    assert sesion_id == fila["id"] and fila["user_agent"] == "" and fila["metodo"] == "passkey"


def test_login_ok_se_loguea_con_ip_y_metodo(anon_client, caplog):
    caplog.set_level("INFO", logger="moni.auth")
    login(anon_client)
    assert [r.getMessage() for r in caplog.records if r.name == "moni.auth"] == ["login ok ip=198.51.100.7 metodo=clave"]
