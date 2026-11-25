import logging
import os
import pathlib
import stat
import subprocess
import sys

import pytest

from backend import main
from backend.core import db
from backend.push import envio, envio_rutas, vapid
from backend.seguridad import ip, sesiones, tiempo
from backend.tests.conftest import CLAVE_TEST, IP_TEST
from backend.tests.seguridad.helpers import cliente, login
from backend.tests.seguridad.passkeys.helpers import OPCIONES_REGISTRO, VERIFICAR_REGISTRO

RAIZ = pathlib.Path(__file__).resolve().parents[3]
TRUNCATE = "/api/truncate"


def _bloquear(c):
    for _ in range(3):
        assert login(c, "mala").status_code == 401


def test_sesion_valida_pasa_aunque_la_ip_este_bloqueada(client):
    anon = cliente()
    _bloquear(anon)
    assert anon.get("/api/meta").status_code == 403
    assert client.get("/api/meta").status_code == 200
    assert client.get("/api/auth/estado").json()["autenticado"] is True


def test_sesion_inactiva_no_se_lista_y_se_purga(client, reloj):
    reloj.avanzar(days=1)
    viejo = db.get_conn()
    viejo.execute(
        "INSERT INTO sesiones (token_hash, creada, expira, ultimo_uso, ip, user_agent, metodo) VALUES ('h', ?, ?, ?, '', '', 'clave')",
        (tiempo.iso(reloj()), tiempo.iso(reloj() + sesiones.datetime.timedelta(days=30)), tiempo.iso(reloj() - sesiones.datetime.timedelta(days=8))),
    )
    viejo.commit()
    viejo.close()
    client.cookies.clear()
    otra = cliente()
    assert login(otra).status_code == 200
    ids = {f["id"] for f in otra.get("/api/auth/sesiones").json()}
    conn = db.get_conn()
    assert conn.execute("SELECT id FROM sesiones WHERE token_hash = 'h'").fetchone() is None
    assert len(ids) == 2
    conn.close()
    conn = db.get_conn()
    assert conn.execute("SELECT COUNT(*) FROM sesiones WHERE token_hash = 'h'").fetchone()[0] == 0
    conn.close()


@pytest.mark.parametrize("cuerpo", [None, {}, {"clave": "mala"}, {"clave": ""}])
def test_truncate_exige_clave_del_dueno(client, cuerpo):
    client.post("/api/tx", json={"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 100})
    r = client.post(TRUNCATE, json=cuerpo)
    assert r.status_code == 403 and "clave" in r.json()["detail"]
    assert client.get("/api/backup").json()["transacciones"]


def test_truncate_con_clave_correcta_vacia(client):
    assert client.post(TRUNCATE, json={"clave": CLAVE_TEST}).status_code == 200


def test_import_exige_clave(client):
    assert client.post("/api/import", json={}).status_code == 403
    assert client.post("/api/import", json={"clave": "mala"}).status_code == 403
    assert client.post("/api/import", json={"clave": CLAVE_TEST}).status_code == 200


def test_registro_de_passkey_exige_clave(client):
    for cuerpo in (None, {"clave": "mala"}):
        assert client.post(OPCIONES_REGISTRO, json=cuerpo).status_code == 403
    assert client.post(OPCIONES_REGISTRO, json={"clave": CLAVE_TEST}).status_code == 200


def test_clave_incorrecta_en_paso_extra_cuenta_para_el_bloqueo(client):
    for _ in range(3):
        assert client.post(TRUNCATE, json={"clave": "mala"}).status_code == 403
    r = client.post(TRUNCATE, json={"clave": CLAVE_TEST})
    assert r.status_code == 403 and r.json()["detail"] == "IP bloqueada"
    assert client.get("/api/meta").status_code == 200


def test_nombre_de_passkey_invalido_responde_detail_en_lista(client):
    r = client.post(VERIFICAR_REGISTRO, json={"nombre": ""})
    assert r.status_code == 422
    assert r.json()["detail"] == [{"loc": ["body", "nombre"], "msg": "Nombre inválido", "type": "value_error"}]


def test_body_grande_en_login_da_413(anon_client):
    r = anon_client.post("/api/auth/login", content=b"x" * 2_000_000, headers={"content-type": "application/json"})
    assert r.status_code == 413


def test_body_sin_content_length_que_se_pasa_da_413(entorno):
    import asyncio

    salida = {}

    async def correr():
        trozos = iter([b'{"clave":"' + b"x" * 600_000, b"x" * 600_000, b'"}'])

        async def receive():
            t = next(trozos)
            return {"type": "http.request", "body": t, "more_body": True}

        async def send(m):
            if m["type"] == "http.response.start":
                salida["status"] = m["status"]

        scope = {"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": "POST", "scheme": "http",
                 "path": "/api/auth/login", "raw_path": b"/api/auth/login", "query_string": b"",
                 "headers": [(b"host", b"t"), (b"x-moni-request", b"1")], "client": IP_TEST, "server": ("t", 80)}
        await main.app(scope, receive, send)

    from fastapi.testclient import TestClient

    with TestClient(main.app):
        asyncio.run(correr())
    assert salida["status"] == 413


def test_import_acepta_hasta_10mb_pero_no_mas(client):
    relleno = "x" * 2_000_000
    r = client.post("/api/import", json={"clave": CLAVE_TEST, "ajustes": [], "relleno": relleno})
    assert r.status_code == 200
    r = client.post("/api/import", content=b" " * 11_000_000, headers={"content-type": "application/json"})
    assert r.status_code == 413


def test_csrf_y_afectadas_usan_ruta_normalizada(client):
    del client.headers["x-moni-request"]
    assert client.post("/API/tx", json={}).status_code == 403
    assert client.post("/api/x/../tx", json={}).status_code == 403


def test_headers_coop_corp(anon_client):
    h = anon_client.get("/api/auth/estado").headers
    assert h["cross-origin-opener-policy"] == "same-origin"
    assert h["cross-origin-resource-policy"] == "same-origin"


def test_warning_una_sola_vez_si_llega_xff_de_peer_no_confiable(entorno, monkeypatch, caplog):
    monkeypatch.setattr(ip, "_xff_avisado", False)
    caplog.set_level(logging.WARNING, logger="moni.auth")
    for _ in range(2):
        login(cliente(IP_TEST, **{"X-Forwarded-For": "1.2.3.4"}), "mala")
    avisos = [r for r in caplog.records if "MONI_TRUSTED_PROXIES" in r.getMessage()]
    assert len(avisos) == 1


def test_sin_warning_si_el_peer_es_proxy_confiable_o_la_variable_esta_definida(entorno, monkeypatch, caplog):
    monkeypatch.setattr(ip, "_xff_avisado", False)
    caplog.set_level(logging.WARNING, logger="moni.auth")
    login(cliente(("127.0.0.1", 1), **{"X-Forwarded-For": "1.2.3.4"}), "mala")
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "10.0.0.0/8")
    login(cliente(IP_TEST, **{"X-Forwarded-For": "1.2.3.4"}), "mala")
    assert not [r for r in caplog.records if "MONI_TRUSTED_PROXIES" in r.getMessage()]


def test_logging_info_a_stdout_con_clave_valor():
    codigo = (
        "import logging, sys, backend.main;"
        "r = logging.getLogger();"
        "logging.getLogger('moni.x').info('hola');"
        "print(r.level)"
    )
    r = subprocess.run([sys.executable, "-c", codigo], capture_output=True, text=True, cwd=RAIZ)
    assert r.stdout.splitlines()[0].startswith('ts=') and 'level=INFO logger=moni.x msg="hola"' in r.stdout.splitlines()[0]
    assert r.stdout.splitlines()[-1] == str(logging.INFO)


def test_vapid_guarda_la_clave_con_permisos_0600_sin_ventana(client):
    ruta = db.DB_PATH.parent / "vapid_private.pem"
    ruta.unlink(missing_ok=True)
    anterior = os.umask(0o022)
    try:
        vapid.clave_privada()
        assert os.umask(0o022) == 0o022
    finally:
        os.umask(anterior)
    assert stat.S_IMODE(ruta.stat().st_mode) == 0o600


def test_push_no_sigue_redirects_ni_retiene_la_conexion_durante_el_envio(client, monkeypatch):
    conn = db.get_conn()
    conn.execute("INSERT INTO push_subs (endpoint, p256dh, auth) VALUES ('https://fcm.googleapis.com/a', 'k', 'a')")
    conn.commit()
    conn.close()
    vistas = {}

    def falso(info, *a, **k):
        vistas["max_redirects"] = k["requests_session"].max_redirects
        escritor = db.get_conn()
        escritor.execute("INSERT INTO push_subs (endpoint, p256dh, auth) VALUES ('https://fcm.googleapis.com/b', 'k', 'a')")
        escritor.commit()
        escritor.close()

    monkeypatch.setattr(envio, "webpush", falso)
    assert envio.enviar_a_todos("t", "b")["enviadas"] == 1
    assert vistas["max_redirects"] == 0


def test_rate_limit_push_es_seguro_entre_hilos(entorno, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor

    from fastapi import HTTPException

    class Req:
        client = type("C", (), {"host": "203.0.113.5"})()
        headers = type("H", (), {"getlist": lambda self, k: []})()

    envio_rutas._envios.clear()

    def intento(_):
        try:
            envio_rutas._limitar(Req())
            return 1
        except HTTPException:
            return 0

    with ThreadPoolExecutor(16) as ex:
        aceptados = sum(ex.map(intento, range(100)))
    assert aceptados == envio_rutas.MAX_ENVIOS
