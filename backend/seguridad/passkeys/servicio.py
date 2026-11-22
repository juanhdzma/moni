import hashlib
import os
import sqlite3

from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
from webauthn.helpers.structs import (
    AuthenticatorAttachment,
    AuthenticatorSelectionCriteria,
    AuthenticatorTransport,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from .. import tiempo
from ...core.db import conexion
from .challenges import guardar_challenge

MAX_PASSKEYS = 10
TRANSPORTES = {"usb", "nfc", "ble", "smart-card", "internal", "cable", "hybrid"}
USER_ID = hashlib.sha256(b"moni-owner").digest()


def rp_id() -> str:
    return os.environ.get("MONI_RP_ID", "moni.nufi.com.co").strip()


def origen() -> str:
    return os.environ.get("MONI_ORIGIN", "https://moni.nufi.com.co").strip()


def _descriptores(conn: sqlite3.Connection) -> list[PublicKeyCredentialDescriptor]:
    filas = conn.execute("SELECT credential_id, transportes FROM passkeys").fetchall()
    return [
        PublicKeyCredentialDescriptor(
            id=base64url_to_bytes(f["credential_id"]),
            transports=[AuthenticatorTransport(t) for t in f["transportes"].split(",") if t in TRANSPORTES] or None,
        )
        for f in filas
    ]


def contar() -> int:
    with conexion() as conn:
        return conn.execute("SELECT COUNT(*) FROM passkeys").fetchone()[0]


def opciones_registro(ip: str) -> str:
    with conexion() as conn:
        opciones = generate_registration_options(
            rp_id=rp_id(),
            rp_name="Moni",
            user_id=USER_ID,
            user_name="moni",
            user_display_name="Moni",
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,
                resident_key=ResidentKeyRequirement.PREFERRED,
                user_verification=UserVerificationRequirement.REQUIRED,
            ),
            exclude_credentials=_descriptores(conn),
        )
        guardar_challenge(conn, "registro", opciones.challenge, ip)
        conn.commit()
    return options_to_json(opciones)


def opciones_login(ip: str) -> str | None:
    with conexion() as conn:
        permitidas = _descriptores(conn)
        if not permitidas:
            return None
        opciones = generate_authentication_options(
            rp_id=rp_id(),
            allow_credentials=permitidas,
            user_verification=UserVerificationRequirement.REQUIRED,
        )
        guardar_challenge(conn, "login", opciones.challenge, ip)
        conn.commit()
    return options_to_json(opciones)


def registrar(credencial: dict, challenge: bytes, nombre: str) -> int | None:
    verificado = verify_registration_response(
        credential=credencial,
        expected_challenge=challenge,
        expected_rp_id=rp_id(),
        expected_origin=origen(),
        require_user_verification=True,
    )
    transportes = credencial.get("response", {}).get("transports") or []
    transportes = ",".join(t for t in transportes if isinstance(t, str) and t in TRANSPORTES)
    with conexion() as conn:
        if conn.execute("SELECT COUNT(*) FROM passkeys").fetchone()[0] >= MAX_PASSKEYS:
            return None
        cur = conn.execute(
            "INSERT INTO passkeys (credential_id, public_key, sign_count, transportes, nombre, creada) VALUES (?, ?, ?, ?, ?, ?)",
            (
                bytes_to_base64url(verificado.credential_id),
                bytes_to_base64url(verificado.credential_public_key),
                verificado.sign_count,
                transportes,
                nombre,
                tiempo.iso(tiempo.ahora()),
            ),
        )
        conn.commit()
        return cur.lastrowid


def verificar_login(credencial: dict, challenge: bytes) -> bool:
    credential_id = credencial.get("id")
    if not isinstance(credential_id, str):
        return False
    with conexion() as conn:
        fila = conn.execute("SELECT * FROM passkeys WHERE credential_id = ?", (credential_id,)).fetchone()
        if fila is None:
            return False
        verificado = verify_authentication_response(
            credential=credencial,
            expected_challenge=challenge,
            expected_rp_id=rp_id(),
            expected_origin=origen(),
            credential_public_key=base64url_to_bytes(fila["public_key"]),
            credential_current_sign_count=fila["sign_count"],
            require_user_verification=True,
        )
        conn.execute(
            "UPDATE passkeys SET sign_count = ?, ultimo_uso = ? WHERE id = ?",
            (verificado.new_sign_count, tiempo.iso(tiempo.ahora()), fila["id"]),
        )
        conn.commit()
        return True
