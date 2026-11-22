import hashlib
import json
import os
import struct

import cbor2
import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url

from backend import auth, db

RP_ID = "localhost"
ORIGIN = "http://localhost:8080"
OPCIONES_REGISTRO = "/api/auth/passkey/registro/opciones"
VERIFICAR_REGISTRO = "/api/auth/passkey/registro/verificar"
OPCIONES_LOGIN = "/api/auth/passkey/login/opciones"
VERIFICAR_LOGIN = "/api/auth/passkey/login/verificar"


class Autenticador:
    def __init__(self):
        self.clave = ec.generate_private_key(ec.SECP256R1())
        self.credential_id = os.urandom(32)
        self.sign_count = 0

    def _cose(self):
        n = self.clave.public_key().public_numbers()
        return cbor2.dumps({1: 2, 3: -7, -1: 1, -2: n.x.to_bytes(32, "big"), -3: n.y.to_bytes(32, "big")})

    def registrar(self, opciones, origin=ORIGIN, rp_id=RP_ID, uv=True):
        client = json.dumps({"type": "webauthn.create", "challenge": opciones["challenge"], "origin": origin}).encode()
        flags = 0x01 | 0x40 | (0x04 if uv else 0)
        datos = (
            hashlib.sha256(rp_id.encode()).digest()
            + bytes([flags])
            + struct.pack(">I", self.sign_count)
            + bytes(16)
            + struct.pack(">H", len(self.credential_id))
            + self.credential_id
            + self._cose()
        )
        objeto = cbor2.dumps({"fmt": "none", "attStmt": {}, "authData": datos})
        cid = bytes_to_base64url(self.credential_id)
        return {
            "id": cid,
            "rawId": cid,
            "type": "public-key",
            "response": {
                "clientDataJSON": bytes_to_base64url(client),
                "attestationObject": bytes_to_base64url(objeto),
                "transports": ["internal"],
            },
            "clientExtensionResults": {},
        }

    def firmar(self, opciones, sign_count, origin=ORIGIN, rp_id=RP_ID, uv=True, tipo="webauthn.get"):
        client = json.dumps({"type": tipo, "challenge": opciones["challenge"], "origin": origin}).encode()
        datos = hashlib.sha256(rp_id.encode()).digest() + bytes([0x01 | (0x04 if uv else 0)]) + struct.pack(">I", sign_count)
        firma = self.clave.sign(datos + hashlib.sha256(client).digest(), ec.ECDSA(hashes.SHA256()))
        cid = bytes_to_base64url(self.credential_id)
        return {
            "id": cid,
            "rawId": cid,
            "type": "public-key",
            "response": {
                "clientDataJSON": bytes_to_base64url(client),
                "authenticatorData": bytes_to_base64url(datos),
                "signature": bytes_to_base64url(firma),
            },
            "clientExtensionResults": {},
        }


@pytest.fixture(autouse=True)
def webauthn_env(monkeypatch):
    monkeypatch.setenv("MONI_RP_ID", RP_ID)
    monkeypatch.setenv("MONI_ORIGIN", ORIGIN)


def alta(client, nombre="iPhone", auten=None):
    auten = auten or Autenticador()
    opciones = client.post(OPCIONES_REGISTRO, json={"nombre": nombre}).json()
    r = client.post(VERIFICAR_REGISTRO, json={**auten.registrar(opciones), "nombre": nombre})
    return auten, r


def intento_login(client, auten, sign_count, **kw):
    opciones = client.post(OPCIONES_LOGIN).json()
    return client.post(VERIFICAR_LOGIN, json=auten.firmar(opciones, sign_count, **kw))


def fallos():
    conn = db.get_conn()
    try:
        return conn.execute("SELECT COUNT(*) FROM intentos_fallidos").fetchone()[0]
    finally:
        conn.close()


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


def test_registro_y_login_ok(client):
    auten, r = alta(client)
    assert r.status_code == 200 and r.json()["ok"] is True
    lista = client.get("/api/auth/passkeys").json()
    assert [p["nombre"] for p in lista] == ["iPhone"]
    assert client.get("/api/auth/estado").json()["passkeys"] == 1
    client.cookies.clear()
    assert client.get("/api/all").status_code == 401
    r = intento_login(client, auten, 1)
    assert r.status_code == 200
    assert "moni_session" in r.cookies
    assert client.get("/api/all").status_code == 200


def test_login_sin_passkeys_404(anon_client):
    assert anon_client.post(OPCIONES_LOGIN).status_code == 404


def test_opciones_login_listan_credenciales(client):
    auten, _ = alta(client)
    client.cookies.clear()
    o = client.post(OPCIONES_LOGIN).json()
    assert [c["id"] for c in o["allowCredentials"]] == [bytes_to_base64url(auten.credential_id)]
    assert o["userVerification"] == "required"


def test_challenge_reusado_falla(client):
    auten, _ = alta(client)
    client.cookies.clear()
    opciones = client.post(OPCIONES_LOGIN).json()
    cred = auten.firmar(opciones, 1)
    assert client.post(VERIFICAR_LOGIN, json=cred).status_code == 200
    client.cookies.clear()
    r = client.post(VERIFICAR_LOGIN, json=auten.firmar(opciones, 2))
    assert r.status_code == 401 and r.json() == {"detail": "Credenciales invalidas"}
    assert fallos() == 1


def test_challenge_expirado_falla(client):
    auten, _ = alta(client)
    client.cookies.clear()
    opciones = client.post(OPCIONES_LOGIN).json()
    conn = db.get_conn()
    conn.execute("UPDATE challenges SET expira = '2000-01-01T00:00:00'")
    conn.commit()
    conn.close()
    assert client.post(VERIFICAR_LOGIN, json=auten.firmar(opciones, 1)).status_code == 401
    assert fallos() == 1


def test_challenge_de_otra_ip_falla(client, monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "198.51.100.0/24")
    auten, _ = alta(client)
    client.cookies.clear()
    opciones = client.post(OPCIONES_LOGIN, headers={"X-Forwarded-For": "203.0.113.1"}).json()
    r = client.post(VERIFICAR_LOGIN, json=auten.firmar(opciones, 1), headers={"X-Forwarded-For": "203.0.113.2"})
    assert r.status_code == 401


def test_challenge_de_registro_no_sirve_para_login(client):
    auten, _ = alta(client)
    opciones = client.post(OPCIONES_REGISTRO, json={"nombre": "otro"}).json()
    client.cookies.clear()
    assert client.post(VERIFICAR_LOGIN, json=auten.firmar(opciones, 1)).status_code == 401


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


def test_challenges_por_ip_acotados(anon_client, client):
    alta(client)
    client.cookies.clear()
    for _ in range(12):
        client.post(OPCIONES_LOGIN)
    conn = db.get_conn()
    assert conn.execute("SELECT COUNT(*) FROM challenges").fetchone()[0] <= 5
    conn.close()
