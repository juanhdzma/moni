import datetime
import json
import sqlite3

from webauthn.helpers import base64url_to_bytes, bytes_to_base64url

from .. import tiempo
from ...core.db import conexion

CHALLENGE_TTL_S = 300
MAX_CHALLENGES_POR_IP = 5


def guardar_challenge(conn: sqlite3.Connection, tipo: str, challenge: bytes, ip: str) -> None:
    t = tiempo.ahora()
    conn.execute("DELETE FROM challenges WHERE expira <= ?", (tiempo.iso(t),))
    conn.execute(
        "DELETE FROM challenges WHERE ip = ? AND id NOT IN (SELECT id FROM challenges WHERE ip = ? ORDER BY id DESC LIMIT ?)",
        (ip, ip, MAX_CHALLENGES_POR_IP - 1),
    )
    conn.execute(
        "INSERT INTO challenges (tipo, challenge, ip, expira) VALUES (?, ?, ?, ?)",
        (tipo, bytes_to_base64url(challenge), ip, tiempo.iso(t + datetime.timedelta(seconds=CHALLENGE_TTL_S))),
    )


def consumir_challenge(credencial: dict, tipo: str, ip: str) -> bytes | None:
    try:
        datos = json.loads(base64url_to_bytes(credencial["response"]["clientDataJSON"]))
        challenge = datos["challenge"]
        if not isinstance(challenge, str):
            return None
    except Exception:
        return None
    with conexion() as conn:
        fila = conn.execute(
            "SELECT id, expira FROM challenges WHERE challenge = ? AND tipo = ? AND ip = ?", (challenge, tipo, ip)
        ).fetchone()
        if fila is None:
            return None
        borrada = conn.execute("DELETE FROM challenges WHERE id = ?", (fila["id"],)).rowcount
        conn.commit()
    if borrada != 1 or fila["expira"] <= tiempo.iso(tiempo.ahora()):
        return None
    return base64url_to_bytes(challenge)
