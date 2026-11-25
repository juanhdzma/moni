from backend.tests.conftest import CLAVE_TEST
import hashlib
import json
import os
import struct

import cbor2
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from webauthn.helpers import bytes_to_base64url

from backend.core import db

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




def alta(client, nombre="iPhone", auten=None):
    auten = auten or Autenticador()
    opciones = client.post(OPCIONES_REGISTRO, json={"clave": CLAVE_TEST}).json()
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
