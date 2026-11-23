from webauthn.helpers import bytes_to_base64url
from backend.core import db
from backend.tests.seguridad.passkeys.helpers import Autenticador, alta, intento_login, fallos, OPCIONES_LOGIN, VERIFICAR_LOGIN


def test_registro_y_login_ok(client):
    auten, r = alta(client)
    assert r.status_code == 200 and r.json()["ok"] is True
    lista = client.get("/api/auth/passkeys").json()
    assert [p["nombre"] for p in lista] == ["iPhone"]
    assert client.get("/api/auth/estado").json()["passkeys"] == 1
    client.cookies.clear()
    assert client.get("/api/backup").status_code == 401
    r = intento_login(client, auten, 1)
    assert r.status_code == 200
    assert "moni_session" in r.cookies
    assert client.get("/api/backup").status_code == 200


def test_login_sin_passkeys_404(anon_client):
    assert anon_client.post(OPCIONES_LOGIN).status_code == 404


def test_opciones_login_listan_credenciales(client):
    auten, _ = alta(client)
    client.cookies.clear()
    o = client.post(OPCIONES_LOGIN).json()
    assert [c["id"] for c in o["allowCredentials"]] == [bytes_to_base64url(auten.credential_id)]
    assert o["userVerification"] == "required"


def test_origin_incorrecto_falla_y_cuenta(client):
    auten, _ = alta(client)
    client.cookies.clear()
    r = intento_login(client, auten, 1, origin="https://evil.example")
    assert r.status_code == 401
    assert fallos() == 1


def test_rp_id_incorrecto_falla(client):
    auten, _ = alta(client)
    client.cookies.clear()
    assert intento_login(client, auten, 1, rp_id="evil.example").status_code == 401


def test_sin_user_verification_falla(client):
    auten, _ = alta(client)
    client.cookies.clear()
    assert intento_login(client, auten, 1, uv=False).status_code == 401


def test_tipo_de_ceremonia_incorrecto_falla(client):
    auten, _ = alta(client)
    client.cookies.clear()
    assert intento_login(client, auten, 1, tipo="webauthn.create").status_code == 401


def test_firma_de_otra_clave_falla(client):
    auten, _ = alta(client)
    client.cookies.clear()
    impostor = Autenticador()
    impostor.credential_id = auten.credential_id
    assert intento_login(client, impostor, 1).status_code == 401


def test_credencial_desconocida_falla(client):
    alta(client)
    client.cookies.clear()
    assert intento_login(client, Autenticador(), 1).status_code == 401
    assert fallos() == 1


def test_sign_count_que_no_aumenta_falla(client):
    auten, _ = alta(client)
    client.cookies.clear()
    assert intento_login(client, auten, 5).status_code == 200
    client.cookies.clear()
    assert intento_login(client, auten, 5).status_code == 401
    assert intento_login(client, auten, 3).status_code == 401
    assert fallos() == 2
    assert intento_login(client, auten, 6).status_code == 200
    conn = db.get_conn()
    assert conn.execute("SELECT sign_count FROM passkeys").fetchone()[0] == 6
    conn.close()


def test_tres_fallos_de_passkey_bloquean_la_ip(anon_client, client):
    auten, _ = alta(client)
    client.cookies.clear()
    for _ in range(3):
        assert intento_login(client, Autenticador(), 1).status_code == 401
    r = client.post(OPCIONES_LOGIN)
    assert r.status_code == 403 and r.json()["detail"] == "IP bloqueada"
    assert client.post(VERIFICAR_LOGIN, json={}).status_code == 403


def test_basura_en_verificar_login_no_rompe(client):
    alta(client)
    client.cookies.clear()
    for cuerpo in ({}, {"id": 1}, {"id": "a", "response": {"clientDataJSON": "!!!"}}):
        assert client.post(VERIFICAR_LOGIN, json=cuerpo).status_code == 401
