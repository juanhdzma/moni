import base64
import os
import threading

from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid02

from ..core import db

VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "https://moni.nufi.com.co")
_lock = threading.Lock()


def clave_privada() -> Vapid02:
    path = db.DB_PATH.parent / "vapid_private.pem"
    with _lock:
        if path.exists():
            return Vapid02.from_file(str(path))
        v = Vapid02()
        v.generate_keys()
        anterior = os.umask(0o077)
        try:
            v.save_key(str(path))
        finally:
            os.umask(anterior)
        return v


def public_key() -> str:
    raw = clave_privada().public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()
