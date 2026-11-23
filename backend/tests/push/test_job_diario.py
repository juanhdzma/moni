import datetime

import pytest

from backend.core import db
from backend.core.ops_ocultas import candidatas
from backend.push import envio, job_diario
from backend.tests.push.constantes import SUB, HOY


def test_operaciones_proximas_hoy_y_manana(client, prestamo):
    client.put(f"/api/deuda/{prestamo['id']}", json={**prestamo, "proxima_cuota": "2026-06-16"})
    client.post("/api/rec", json={"nombre": "Salario", "tipo": "ingreso", "monto": 3_000_000, "frecuencia": "mensual", "fecha_inicio": "2026-05-15"})
    client.post("/api/rec", json={"nombre": "Lejano", "tipo": "gasto", "monto": 5, "frecuencia": "mensual", "fecha_inicio": "2026-05-25"})
    client.post("/api/rec", json={"nombre": "Pausado", "tipo": "gasto", "monto": 5, "frecuencia": "mensual", "fecha_inicio": "2026-05-15", "activo": False})

    conn = db.get_conn()
    ops = job_diario.operaciones_del_dia(conn, HOY)
    conn.close()
    assert [(o[0].isoformat(), o[1], o[2]) for o in ops] == [
        ("2026-06-15", "Salario", 3_000_000),
        ("2026-06-16", "Credito", -100_000),
    ]
    msg = job_diario.armar_mensaje(ops, HOY)
    assert msg["title"] == "Moni: 2 operaciones"
    assert msg["body"] == "Hoy: Salario +$3.000.000\nMañana: Credito -$100.000"


def test_operacion_oculta_no_se_avisa_y_usa_simbolo(client, monkeypatch):
    client.post("/api/push/subscribe", json=SUB)
    client.post("/api/rec", json={"nombre": "Netflix", "tipo": "gasto", "monto": 30_000, "frecuencia": "mensual", "fecha_inicio": "2026-05-15"})
    client.post("/api/rec", json={"nombre": "Gym", "tipo": "gasto", "monto": 50_000, "frecuencia": "mensual", "fecha_inicio": "2026-05-15"})
    conn = db.get_conn()
    ops = job_diario.operaciones_del_dia(conn, HOY)
    ocultar = next(c for c in candidatas(conn, HOY) if c["etiqueta"] == "Netflix")["clave"]
    conn.close()
    assert len(ops) == 2
    client.post("/api/ops-ocultas", json={"clave": ocultar})
    client.put("/api/ajustes", json={"moneda_simbolo": "US$"})
    enviados = []
    monkeypatch.setattr(envio, "webpush", lambda info, data, **kw: enviados.append(data))
    assert job_diario.avisar(HOY) == 1
    assert "Gym -US$50.000" in enviados[0] and "Netflix" not in enviados[0]


def test_avisar_envia_y_poda_subs_muertas(client, monkeypatch):
    client.post("/api/push/subscribe", json=SUB)
    client.post("/api/push/subscribe", json={**SUB, "endpoint": "https://web.push.apple.com/muerta"})
    client.post("/api/rec", json={"nombre": "Netflix", "tipo": "gasto", "monto": 30_000, "frecuencia": "mensual", "fecha_inicio": "2026-05-15"})
    llamadas = []

    class Resp:
        status_code = 410

    def falso_webpush(info, data, **kw):
        llamadas.append(info["endpoint"])
        if "apple" in info["endpoint"]:
            raise envio.WebPushException("gone", response=Resp())

    monkeypatch.setattr(envio, "webpush", falso_webpush)
    assert job_diario.avisar(HOY) == 1
    assert len(llamadas) == 2

    conn = db.get_conn()
    restantes = [r["endpoint"] for r in conn.execute("SELECT endpoint FROM push_subs")]
    conn.close()
    assert restantes == [SUB["endpoint"]]


def test_avisar_sin_operaciones_no_envia(client, monkeypatch):
    client.post("/api/push/subscribe", json=SUB)
    monkeypatch.setattr(envio, "webpush", lambda *a, **k: pytest.fail("no debía enviar"))
    assert job_diario.avisar(HOY) == 0


def test_segundos_hasta_aviso():
    tz = job_diario.TZ
    assert job_diario.segundos_hasta_aviso(datetime.datetime(2026, 6, 15, 7, 0, tzinfo=tz)) == 3600
    assert job_diario.segundos_hasta_aviso(datetime.datetime(2026, 6, 15, 8, 0, tzinfo=tz)) == 86400
