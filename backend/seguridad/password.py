import base64
import hashlib
import hmac
import os
import secrets

MIN_CLAVE = 12
SCRYPT_N = 2**15
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_MAXMEM = 256 * 1024 * 1024


def _b64(b: bytes) -> str:
    return base64.b64encode(b).decode()


def hash_clave(clave: str) -> str:
    salt = secrets.token_bytes(16)
    h = hashlib.scrypt(clave.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, maxmem=SCRYPT_MAXMEM, dklen=32)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${_b64(salt)}${_b64(h)}"


def _parse_hash(valor: str):
    try:
        esquema, n, r, p, salt, h = valor.split("$")
        if esquema != "scrypt":
            return None
        n, r, p = int(n), int(r), int(p)
        salt, h = base64.b64decode(salt, validate=True), base64.b64decode(h, validate=True)
        if n < 2 or n & (n - 1) or r < 1 or p < 1 or not salt or not h:
            return None
        return n, r, p, salt, h
    except (ValueError, TypeError):
        return None


def _hash_configurado():
    valor = os.environ.get("MONI_PASSWORD_HASH", "").strip().strip("'\"")
    return _parse_hash(valor) if valor else None


def configurado() -> bool:
    return _hash_configurado() is not None


def verificar_clave(clave: str) -> bool:
    parsed = _hash_configurado()
    if parsed is None:
        return False
    n, r, p, salt, esperado = parsed
    try:
        h = hashlib.scrypt(clave.encode(), salt=salt, n=n, r=r, p=p, maxmem=SCRYPT_MAXMEM, dklen=len(esperado))
    except (ValueError, MemoryError):
        return False
    return hmac.compare_digest(h, esperado)
