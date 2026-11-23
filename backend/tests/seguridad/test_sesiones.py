from backend.core import db
from backend.seguridad import sesiones
from backend.tests.seguridad.helpers import login


def test_sesion_expirada(anon_client, reloj):
    login(anon_client)
    assert anon_client.get("/api/backup").status_code == 200
    reloj.avanzar(days=29, hours=23)
    assert anon_client.get("/api/backup").status_code == 200
    reloj.avanzar(hours=2)
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
