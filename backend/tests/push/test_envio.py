
from backend.core import db
from backend.push import envio, vapid


def test_enviar_sigue_ante_error_de_red_y_limpia_410(client, monkeypatch):

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
            raise envio.WebPushException("gone", response=Resp())

    monkeypatch.setattr(envio, "webpush", falso)
    assert envio.enviar_a_todos("t", "b") == {"enviadas": 1, "eliminadas": 1}
    conn = db.get_conn()
    restantes = sorted(r["endpoint"] for r in conn.execute("SELECT endpoint FROM push_subs"))
    conn.close()
    assert restantes == ["https://fcm.googleapis.com/a", "https://fcm.googleapis.com/c"]


def test_vapid_concurrente_genera_una_sola_clave(client):
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(8) as ex:
        keys = set(ex.map(lambda _: vapid.public_key(), range(8)))
    assert len(keys) == 1


def test_enviar_no_hace_commit_si_hay_excepcion(client, monkeypatch):
    conn = db.get_conn()
    conn.execute("INSERT INTO push_subs (endpoint, p256dh, auth) VALUES ('https://fcm.googleapis.com/a', 'k', 'a')")
    conn.commit()
    conn.close()

    class Resp:
        status_code = 410

    def falso(*a, **k):
        raise envio.WebPushException("gone", response=Resp())

    monkeypatch.setattr(envio, "webpush", falso)
    monkeypatch.setattr(envio, "clave_privada", lambda: (_ for _ in ()).throw(RuntimeError("boom")))
    try:
        envio.enviar_a_todos("t", "b")
    except RuntimeError:
        pass
    conn = db.get_conn()
    assert conn.execute("SELECT COUNT(*) FROM push_subs").fetchone()[0] == 1
    conn.close()
