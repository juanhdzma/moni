import asyncio
import datetime
import json
from types import SimpleNamespace

import pytest

from backend.core import db
from backend.seguridad import bloqueo, tiempo
from backend.tests.conftest import IP_TEST
from backend.tests.seguridad.helpers import login


def _req(ip=IP_TEST[0]):
    return SimpleNamespace(
        client=SimpleNamespace(host=ip), headers=SimpleNamespace(getlist=lambda k: [])
    )


def _sql(consulta, *params):
    conn = db.get_conn()
    try:
        filas = conn.execute(consulta, params).fetchall()
        conn.commit()
        return [dict(f) for f in filas]
    finally:
        conn.close()


def _bloquear_hasta(reloj, segundos, ip=IP_TEST[0]):
    desde = tiempo.iso(reloj())
    hasta = tiempo.iso(reloj() + datetime.timedelta(seconds=segundos))
    _sql("INSERT INTO ips_bloqueadas (ip, desde, hasta, motivo) VALUES (?, ?, ?, 'x')", ip, desde, hasta)


@pytest.mark.parametrize("valor", ["0", "-1", "-0.5", "abc", "", "nan"])
def test_horas_de_bloqueo_invalidas_o_no_positivas_caen_a_24(monkeypatch, valor):
    monkeypatch.setenv("MONI_BLOCK_HOURS", valor)
    horas = bloqueo._horas_bloqueo()
    assert horas == 24.0 and isinstance(horas, float)


def test_horas_de_bloqueo_ausente_es_24(monkeypatch):
    monkeypatch.delenv("MONI_BLOCK_HOURS", raising=False)
    assert bloqueo._horas_bloqueo() == 24.0


@pytest.mark.parametrize("valor,esperado", [("1", 1.0), ("0.5", 0.5), ("48", 48.0)])
def test_horas_de_bloqueo_validas_se_respetan(monkeypatch, valor, esperado):
    monkeypatch.setenv("MONI_BLOCK_HOURS", valor)
    assert bloqueo._horas_bloqueo() == esperado


@pytest.mark.parametrize("valor", ["0", "-1", "abc"])
def test_el_bloqueo_real_dura_24_horas_con_la_variable_invalida(anon_client, monkeypatch, valor):
    monkeypatch.setenv("MONI_BLOCK_HOURS", valor)
    for _ in range(3):
        login(anon_client, "x")
    assert login(anon_client).json()["reintentar_en_s"] == 86400


def test_registrar_fallo_guarda_la_fila_de_bloqueo_completa(entorno, reloj, monkeypatch):
    monkeypatch.setenv("MONI_BLOCK_HOURS", "2")
    assert [bloqueo.registrar_fallo(_req(), "clave") for _ in range(3)] == [False, False, True]
    assert _sql("SELECT * FROM ips_bloqueadas") == [
        {"ip": IP_TEST[0], "desde": "2026-01-01T12:00:00", "hasta": "2026-01-01T14:00:00", "motivo": "clave"}
    ]
    assert _sql("SELECT COUNT(*) AS n FROM intentos_fallidos") == [{"n": 0}]


def test_fallo_registra_ip_motivo_y_marca_de_tiempo(entorno, reloj):
    bloqueo.registrar_fallo(_req(), "passkey")
    assert _sql("SELECT ip, ts, motivo FROM intentos_fallidos") == [
        {"ip": IP_TEST[0], "ts": "2026-01-01T12:00:00", "motivo": "passkey"}
    ]


def test_intentos_de_otra_ip_no_cuentan(entorno):
    for _ in range(2):
        bloqueo.registrar_fallo(_req("203.0.113.1"), "clave")
    assert bloqueo.registrar_fallo(_req("203.0.113.2"), "clave") is False


@pytest.mark.parametrize("antiguedad_s,bloquea", [(3600, True), (3601, False)])
def test_ventana_de_fallos_borde_exacto_de_una_hora(entorno, reloj, antiguedad_s, bloquea):
    viejo = tiempo.iso(reloj() - datetime.timedelta(seconds=antiguedad_s))
    for _ in range(2):
        _sql("INSERT INTO intentos_fallidos (ip, ts, motivo) VALUES (?, ?, 'clave')", IP_TEST[0], viejo)
    assert bloqueo.registrar_fallo(_req(), "clave") is bloquea


def test_registrar_fallo_poda_bloqueos_que_vencen_justo_ahora(entorno, reloj):
    _bloquear_hasta(reloj, 0, "203.0.113.9")
    bloqueo.registrar_fallo(_req(), "clave")
    assert _sql("SELECT COUNT(*) AS n FROM ips_bloqueadas") == [{"n": 0}]


def test_ip_bloqueada_con_restante_exactamente_cero_se_libera_y_borra_la_fila(entorno, reloj):
    _bloquear_hasta(reloj, 0)
    assert bloqueo.ip_bloqueada(IP_TEST[0]) == 0
    assert _sql("SELECT COUNT(*) AS n FROM ips_bloqueadas") == [{"n": 0}]


def test_ip_bloqueada_un_segundo_restante_devuelve_uno_y_conserva_la_fila(entorno, reloj):
    _bloquear_hasta(reloj, 1)
    assert bloqueo.ip_bloqueada(IP_TEST[0]) == 1
    assert _sql("SELECT COUNT(*) AS n FROM ips_bloqueadas") == [{"n": 1}]


def test_ip_sin_bloqueo_devuelve_cero_y_respuesta_none(entorno):
    assert bloqueo.ip_bloqueada("203.0.113.5") == 0
    assert bloqueo.respuesta_si_bloqueada("203.0.113.5") is None


def test_retry_after_minimo_de_un_segundo_en_la_respuesta_http(anon_client, reloj):
    _bloquear_hasta(reloj, 1)
    r = anon_client.get("/api/auth/estado")
    assert r.status_code == 403
    assert r.headers["retry-after"] == "1"
    assert r.json() == {"detail": "IP bloqueada", "reintentar_en_s": 1, "texto": "Demasiados intentos. Probá de nuevo en 1 min."}


@pytest.mark.parametrize(
    "segundos,texto",
    [(0, "1 min"), (1, "1 min"), (59, "1 min"), (60, "1 min"), (61, "2 min"), (3599, "1 h"), (3600, "1 h"),
     (3601, "1 h 1 min"), (5400, "1 h 30 min"), (86400, "24 h")],
)
def test_duracion(segundos, texto):
    assert bloqueo._duracion(segundos) == texto


def test_respuesta_bloqueada_cuerpo_y_cabecera_exactos():
    r = bloqueo.respuesta_bloqueada(5400)
    assert r.status_code == 403 and r.headers["retry-after"] == "5400"
    assert json.loads(r.body) == {
        "detail": "IP bloqueada",
        "reintentar_en_s": 5400,
        "texto": "Demasiados intentos. Probá de nuevo en 1 h 30 min.",
    }


def test_retraso_de_fallo_por_defecto_y_se_espera(entorno, monkeypatch):
    esperas = []

    async def dormir(s):
        esperas.append(s)

    monkeypatch.setattr(bloqueo.asyncio, "sleep", dormir)
    monkeypatch.setattr(bloqueo, "RETRASO_FALLO", 0.5)
    r = asyncio.run(bloqueo.fallo_generico(_req(), "clave"))
    assert esperas == [0.5]
    assert r.status_code == 401 and json.loads(r.body) == {"detail": "Credenciales inválidas"}


def test_retraso_de_fallo_vale_medio_segundo_por_defecto():
    assert bloqueo.RETRASO_FALLO == 0.5


def test_fallo_generico_con_status_y_detalle_propios_y_sin_espera(entorno, monkeypatch):
    async def dormir(s):
        raise AssertionError("no debe dormir con retraso 0")

    monkeypatch.setattr(bloqueo.asyncio, "sleep", dormir)
    r = asyncio.run(bloqueo.fallo_generico(_req(), "step_up", 403, "otro detalle"))
    assert r.status_code == 403 and json.loads(r.body) == {"detail": "otro detalle"}
    assert _sql("SELECT motivo FROM intentos_fallidos") == [{"motivo": "step_up"}]


def test_lock_ip_es_uno_por_ip():
    a = bloqueo.lock_ip("1.1.1.1")
    assert bloqueo.lock_ip("1.1.1.1") is a
    assert bloqueo.lock_ip("2.2.2.2") is not a


def test_fallo_y_bloqueo_se_loguean_con_ip_motivo_e_intentos(entorno, caplog):
    caplog.set_level("WARNING", logger="moni.auth")
    for _ in range(3):
        bloqueo.registrar_fallo(_req(), "clave")
    mensajes = [r.getMessage() for r in caplog.records]
    assert mensajes == [
        "fallo de autenticacion ip=198.51.100.7 motivo=clave intentos=1",
        "fallo de autenticacion ip=198.51.100.7 motivo=clave intentos=2",
        "fallo de autenticacion ip=198.51.100.7 motivo=clave intentos=3",
        "ip bloqueada ip=198.51.100.7 motivo=clave",
    ]
