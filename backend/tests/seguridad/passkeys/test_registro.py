from webauthn.helpers import bytes_to_base64url
from backend.tests.seguridad.passkeys.helpers import Autenticador, alta, OPCIONES_REGISTRO, VERIFICAR_REGISTRO, RP_ID


def test_registro_sin_sesion_rechazado(anon_client):
    assert anon_client.post(OPCIONES_REGISTRO, json={"nombre": "x"}).status_code == 401
    assert anon_client.post(VERIFICAR_REGISTRO, json={"nombre": "x"}).status_code == 401
    assert anon_client.get("/api/auth/passkeys").status_code == 401
    assert anon_client.delete("/api/auth/passkeys/1").status_code == 401


def test_opciones_registro_exigen_platform_y_uv(client):
    o = client.post(OPCIONES_REGISTRO, json={"nombre": "iPhone"}).json()
    assert o["authenticatorSelection"]["authenticatorAttachment"] == "platform"
    assert o["authenticatorSelection"]["userVerification"] == "required"
    assert o["rp"]["id"] == RP_ID


def test_registro_challenge_reusado_o_origin_malo(client):
    auten = Autenticador()
    opciones = client.post(OPCIONES_REGISTRO, json={"nombre": "x"}).json()
    r = client.post(VERIFICAR_REGISTRO, json={**auten.registrar(opciones, origin="https://evil.example"), "nombre": "x"})
    assert r.status_code == 400
    r = client.post(VERIFICAR_REGISTRO, json={**auten.registrar(opciones), "nombre": "x"})
    assert r.status_code == 400
    assert client.get("/api/auth/passkeys").json() == []


def test_registro_sin_uv_rechazado(client):
    auten = Autenticador()
    opciones = client.post(OPCIONES_REGISTRO, json={"nombre": "x"}).json()
    r = client.post(VERIFICAR_REGISTRO, json={**auten.registrar(opciones, uv=False), "nombre": "x"})
    assert r.status_code == 400


def test_registro_duplicado_y_exclude_credentials(client):
    auten, _ = alta(client)
    o = client.post(OPCIONES_REGISTRO, json={"nombre": "otra"}).json()
    assert [c["id"] for c in o["excludeCredentials"]] == [bytes_to_base64url(auten.credential_id)]
    r = client.post(VERIFICAR_REGISTRO, json={**auten.registrar(o), "nombre": "otra"})
    assert r.status_code == 409


def test_nombre_invalido(client):
    assert client.post(OPCIONES_REGISTRO, json={"nombre": ""}).status_code == 422
    assert client.post(OPCIONES_REGISTRO, json={"nombre": "x" * 41}).status_code == 422


def test_limite_de_10_passkeys(client):
    for i in range(10):
        assert alta(client, nombre=f"d{i}")[1].status_code == 200
    assert client.post(OPCIONES_REGISTRO, json={"nombre": "once"}).status_code == 409


def test_borrar_passkey(client):
    _, r = alta(client)
    pid = r.json()["id"]
    assert client.delete(f"/api/auth/passkeys/{pid}").status_code == 200
    assert client.delete(f"/api/auth/passkeys/{pid}").status_code == 404
    assert client.get("/api/auth/passkeys").json() == []
