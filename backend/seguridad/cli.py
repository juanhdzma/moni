import getpass
import sys

from ..core import db
from ..core.db import conexion
from .ip import normalizar_ip
from .password import MIN_CLAVE, hash_clave


def _hash() -> int:
    a = getpass.getpass("Clave: ")
    if len(a) < MIN_CLAVE:
        print(f"La clave debe tener al menos {MIN_CLAVE} caracteres", file=sys.stderr)
        return 1
    if a != getpass.getpass("Repetir clave: "):
        print("Las claves no coinciden", file=sys.stderr)
        return 1
    print(f"MONI_PASSWORD_HASH='{hash_clave(a)}'")
    return 0


def _unblock(ip: str) -> int:
    ip = normalizar_ip(ip)
    db.init_db()
    with conexion() as conn:
        n = conn.execute("DELETE FROM ips_bloqueadas WHERE ip = ?", (ip,)).rowcount
        conn.execute("DELETE FROM intentos_fallidos WHERE ip = ?", (ip,))
        conn.commit()
    print(f"{ip}: {'desbloqueada' if n else 'no estaba bloqueada'}")
    return 0


def _blocked() -> int:
    db.init_db()
    with conexion() as conn:
        filas = conn.execute("SELECT ip, desde, hasta, motivo FROM ips_bloqueadas ORDER BY desde").fetchall()
    for f in filas:
        print(f"{f['ip']}\tdesde={f['desde']}\thasta={f['hasta']}\tmotivo={f['motivo']}")
    if not filas:
        print("Sin IPs bloqueadas")
    return 0


def main(argv: list[str]) -> int:
    if argv == ["hash"]:
        return _hash()
    if argv[:1] == ["unblock"] and len(argv) == 2:
        return _unblock(argv[1])
    if argv == ["blocked"]:
        return _blocked()
    print("uso: python -m backend.seguridad hash | unblock <ip> | blocked", file=sys.stderr)
    return 2
