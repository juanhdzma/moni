import datetime

import pytest

from backend import push

SUB = {
    "endpoint": "https://fcm.googleapis.com/fcm/send/abc",
    "keys": {"p256dh": "BPkey", "auth": "authkey"},
}
HOY = datetime.date(2026, 6, 15)


def test_subscribe_guarda_y_es_idempotente(client):
    assert client.post("/api/push/subscribe", json=SUB).status_code == 200
    assert client.post("/api/push/subscribe", json={**SUB, "keys": {"p256dh": "otra", "auth": "x"}}).status_code == 200
    from backend import db

    conn = db.get_conn()
    rows = conn.execute("SELECT * FROM push_subs").fetchall()
    conn.close()
    assert len(rows) == 1 and rows[0]["p256dh"] == "otra"


@pytest.mark.parametrize(
    "endpoint",
    ["http://fcm.googleapis.com/x", "https://evil.example.com/x", "https://fcm.googleapis.com.evil.com/x", "ftp://push.apple.com/x"],
)
def test_subscribe_rechaza_endpoints_ajenos(client, endpoint):
    assert client.post("/api/push/subscribe", json={**SUB, "endpoint": endpoint}).status_code == 422


def test_subscribe_exige_header_csrf(client):
    client.headers.pop("x-moni-request")
    r = client.post("/api/push/subscribe", json=SUB)
    assert r.status_code == 403
    assert "x-moni-request" in r.json()["detail"]
    from backend import db

    conn = db.get_conn()
    n = conn.execute("SELECT COUNT(*) FROM push_subs").fetchone()[0]
    conn.close()
    assert n == 0


def test_unsubscribe_borra(client):
    client.post("/api/push/subscribe", json=SUB)
    assert client.post("/api/push/unsubscribe", json={"endpoint": SUB["endpoint"]}).status_code == 200
    from backend import db

    conn = db.get_conn()
    n = conn.execute("SELECT COUNT(*) FROM push_subs").fetchone()[0]
    conn.close()
    assert n == 0


def test_key_es_un_punto_p256_en_base64url(client):
    k = client.get("/api/push/key").json()["key"]
    assert len(k) == 87 and "=" not in k
    assert client.get("/api/push/key").json()["key"] == k


def test_operaciones_proximas_hoy_y_manana(client, prestamo):
    client.put(f"/api/deuda/{prestamo['id']}", json={**prestamo, "proxima_cuota": "2026-06-16"})
    client.post("/api/rec", json={"nombre": "Salario", "tipo": "ingreso", "monto": 3_000_000, "frecuencia": "mensual", "fecha_inicio": "2026-05-15"})
    client.post("/api/rec", json={"nombre": "Lejano", "tipo": "gasto", "monto": 5, "frecuencia": "mensual", "fecha_inicio": "2026-05-25"})
    client.post("/api/rec", json={"nombre": "Pausado", "tipo": "gasto", "monto": 5, "frecuencia": "mensual", "fecha_inicio": "2026-05-15", "activo": False})
    from backend import db

    conn = db.get_conn()
    ops = push.operaciones_del_dia(conn, HOY)
    conn.close()
    assert [(o[0].isoformat(), o[1], o[2]) for o in ops] == [
        ("2026-06-15", "Salario", 3_000_000),
        ("2026-06-16", "Credito", -100_000),
    ]
    msg = push.armar_mensaje(ops, HOY)
    assert msg["title"] == "Moni: 2 operaciones"
    assert msg["body"] == "Hoy: Salario +$3.000.000\nMañana: Credito -$100.000"


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
            raise push.WebPushException("gone", response=Resp())

    monkeypatch.setattr(push, "webpush", falso_webpush)
    assert push.avisar(HOY) == 1
    assert len(llamadas) == 2
    from backend import db

    conn = db.get_conn()
    restantes = [r["endpoint"] for r in conn.execute("SELECT endpoint FROM push_subs")]
    conn.close()
    assert restantes == [SUB["endpoint"]]


def test_avisar_sin_operaciones_no_envia(client, monkeypatch):
    client.post("/api/push/subscribe", json=SUB)
    monkeypatch.setattr(push, "webpush", lambda *a, **k: pytest.fail("no debía enviar"))
    assert push.avisar(HOY) == 0


def test_segundos_hasta_aviso():
    tz = push.TZ
    assert push.segundos_hasta_aviso(datetime.datetime(2026, 6, 15, 7, 0, tzinfo=tz)) == 3600
    assert push.segundos_hasta_aviso(datetime.datetime(2026, 6, 15, 8, 0, tzinfo=tz)) == 86400


@pytest.mark.parametrize(
    "endpoint",
    ["https://evil.com\\@fcm.googleapis.com/x", "https://user:pw@fcm.googleapis.com/x", "https://fcm.googleapis.com:8443/x"],
)
def test_endpoint_rechaza_parsers_discordantes(endpoint):
    assert not push.endpoint_permitido(endpoint)


def test_enviar_sigue_ante_error_de_red_y_limpia_410(client, monkeypatch):
    from backend import db

    conn = db.get_conn()
    for ep in ("a", "b", "c"):
        conn.execute("INSERT INTO push_subs (endpoint, p256dh, auth) VALUES (?, 'k', 'a')", (f"https://fcm.googleapis.com/{ep}",))
    conn.commit()
    conn.close()

    class Resp:
        status_code = 410

    def falso(info, *a, **k):
        if info["endpoint"].endswith("/a"):
            raise ConnectionError("boom")
        if info["endpoint"].endswith("/b"):
            raise push.WebPushException("gone", response=Resp())

    monkeypatch.setattr(push, "webpush", falso)
    assert push.enviar_a_todos("t", "b") == {"enviadas": 1, "eliminadas": 1}
    conn = db.get_conn()
    restantes = sorted(r["endpoint"] for r in conn.execute("SELECT endpoint FROM push_subs"))
    conn.close()
    assert restantes == ["https://fcm.googleapis.com/a", "https://fcm.googleapis.com/c"]


def test_unsubscribe_limita_endpoint(client):
    assert client.post("/api/push/unsubscribe", json={"endpoint": "x" * 1001}).status_code == 422


def test_migrar_local_limita_tamanos(client):
    assert client.post("/api/migrar-local", json={"categorias": {"gasto": ["x" * 61]}}).status_code == 422
    assert client.post("/api/migrar-local", json={"ops_ocultas": ["x"] * 501}).status_code == 422


def test_get_proximas_operaciones_no_escribe(client):
    from backend import db

    conn = db.get_conn()
    conn.execute("INSERT INTO ops_ocultas (clave, tipo, fuente_id, fecha, creada_en) VALUES ('deuda:99:2030-01-01', 'deuda', 99, '2030-01-01', 'x')")
    conn.commit()
    conn.close()
    assert client.get("/api/proximas-operaciones").status_code == 200
    conn = db.get_conn()
    n = conn.execute("SELECT COUNT(*) FROM ops_ocultas").fetchone()[0]
    conn.close()
    assert n == 1


def test_vapid_concurrente_genera_una_sola_clave(client):
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(8) as ex:
        keys = set(ex.map(lambda _: push.public_key(), range(8)))
    assert len(keys) == 1


def test_arranque_poda_ocultas_obsoletas(client):
    from backend import db, main

    conn = db.get_conn()
    conn.execute("INSERT INTO ops_ocultas (clave, tipo, fuente_id, fecha, creada_en) VALUES ('deuda:99:2030-01-01', 'deuda', 99, '2030-01-01', 'x')")
    conn.execute("INSERT INTO recurrentes (nombre, tipo, monto, frecuencia, activo, fecha_inicio) VALUES ('r', 'gasto', 1, 'mensual', 1, '2030-01-01')")
    conn.commit()
    main._podar_ocultas(conn, datetime.date(2029, 12, 30))
    n = conn.execute("SELECT COUNT(*) FROM ops_ocultas").fetchone()[0]
    conn.close()
    assert n == 0
