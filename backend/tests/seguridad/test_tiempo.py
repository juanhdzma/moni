import datetime

from backend.seguridad import tiempo


def test_texto_bogota_convierte_utc():
    assert tiempo.texto_bogota("2026-03-10T15:30:45") == "2026-03-10 10:30"


def test_texto_bogota_cruza_dia():
    assert tiempo.texto_bogota("2026-03-10T03:00:00") == "2026-03-09 22:00"


def test_texto_bogota_nunca():
    assert tiempo.texto_bogota(None) == "nunca"


def test_sesiones_traen_texto_bogota(anon_client):
    from backend.tests.seguridad.helpers import login

    login(anon_client)
    fila = anon_client.get("/api/auth/sesiones").json()[0]
    esperado = tiempo.desde_iso(fila["creada"]).astimezone(datetime.timezone(datetime.timedelta(hours=-5)))
    assert fila["creada_texto"] == esperado.strftime("%Y-%m-%d %H:%M")


def test_passkeys_sin_uso_dicen_nunca(client):
    from backend.core import db

    conn = db.get_conn()
    try:
        conn.execute(
            "INSERT INTO passkeys (credential_id, public_key, sign_count, transportes, nombre, creada) VALUES (?, ?, 0, '[]', 'iPhone', ?)",
            (b"abc", b"key", "2026-03-10T15:30:45"),
        )
        conn.commit()
    finally:
        conn.close()
    fila = client.get("/api/auth/passkeys").json()[0]
    assert fila["creada_texto"] == "2026-03-10 10:30"
    assert fila["ultimo_uso_texto"] == "nunca"


def test_texto_bogota_no_depende_de_la_zona_del_proceso(monkeypatch):
    import time

    monkeypatch.setenv("TZ", "Asia/Tokyo")
    time.tzset()
    try:
        assert tiempo.texto_bogota("2026-03-10T15:30:45") == "2026-03-10 10:30"
    finally:
        monkeypatch.undo()
        time.tzset()
