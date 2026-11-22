import asyncio
import base64
import datetime
import functools
import getpass
import hashlib
import hmac
import ipaddress
import logging
import os
import secrets
import sys
import weakref

from fastapi import Request
from fastapi.responses import JSONResponse

from . import db

logger = logging.getLogger("moni.auth")

COOKIE = "moni_session"
SESION_DIAS = 30
VENTANA_FALLOS_S = 3600
MAX_FALLOS = 3
RETRASO_FALLO = 0.5
MIN_CLAVE = 12
SCRYPT_N = 2**15
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_MAXMEM = 256 * 1024 * 1024
DEFAULT_PROXIES = "127.0.0.0/8,::1/128"
PUBLICAS = {
    ("GET", "/api/auth/estado"),
    ("POST", "/api/auth/login"),
    ("POST", "/api/auth/passkey/login/opciones"),
    ("POST", "/api/auth/passkey/login/verificar"),
}
PUSH_ENVIAR = "/api/push/enviar"
CSP = (
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
    "script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)


def ahora() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def iso(dt: datetime.datetime) -> str:
    return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


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


@functools.lru_cache(maxsize=8)
def _redes(csv: str):
    redes = []
    for parte in csv.split(","):
        parte = parte.strip()
        if parte:
            redes.append(ipaddress.ip_network(parte, strict=False))
    return tuple(redes)


def _proxies_confiables():
    csv = os.environ.get("MONI_TRUSTED_PROXIES")
    try:
        return _redes(DEFAULT_PROXIES if csv is None else csv)
    except ValueError:
        logger.error("MONI_TRUSTED_PROXIES invalido, no se confia en ningun proxy")
        return ()


def _es_confiable(valor: str, redes) -> bool:
    try:
        ip = ipaddress.ip_address(valor)
    except ValueError:
        return False
    if ip.version == 6 and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return any(ip in red for red in redes if red.version == ip.version)


def normalizar_ip(valor: str) -> str:
    try:
        ip = ipaddress.ip_address(valor.strip())
    except ValueError:
        return valor.strip()
    if ip.version == 6:
        if ip.ipv4_mapped:
            return str(ip.ipv4_mapped)
        return str(ipaddress.ip_network(f"{ip}/64", strict=False))
    return str(ip)


def _peer(request: Request) -> str:
    return request.client.host if request.client else ""


def client_ip(request: Request) -> str:
    peer = _peer(request)
    redes = _proxies_confiables()
    if peer and _es_confiable(peer, redes):
        xff = ",".join(request.headers.getlist("x-forwarded-for"))
        partes = []
        for p in xff.split(","):
            try:
                ipaddress.ip_address(p.strip())
            except ValueError:
                continue
            partes.append(p.strip())
        for p in reversed(partes):
            if not _es_confiable(p, redes):
                return normalizar_ip(p)
        if partes:
            return normalizar_ip(partes[0])
    return normalizar_ip(peer) if peer else "desconocida"


def es_https(request: Request) -> bool:
    if request.url.scheme == "https":
        return True
    peer = _peer(request)
    return (
        request.headers.get("x-forwarded-proto", "").split(",")[-1].strip().lower() == "https"
        and bool(peer)
        and _es_confiable(peer, _proxies_confiables())
    )


def _horas_bloqueo() -> float:
    try:
        v = float(os.environ.get("MONI_BLOCK_HOURS", "24"))
        return v if v > 0 else 24.0
    except ValueError:
        return 24.0


_locks: "weakref.WeakValueDictionary[str, asyncio.Lock]" = weakref.WeakValueDictionary()


def lock_ip(ip: str) -> asyncio.Lock:
    lock = _locks.get(ip)
    if lock is None:
        lock = _locks[ip] = asyncio.Lock()
    return lock


def ip_bloqueada(ip: str) -> int:
    conn = db.get_conn()
    try:
        fila = conn.execute("SELECT hasta FROM ips_bloqueadas WHERE ip = ?", (ip,)).fetchone()
        if fila is None:
            return 0
        restante = (
            datetime.datetime.strptime(fila["hasta"], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=datetime.timezone.utc) - ahora()
        ).total_seconds()
        if restante <= 0:
            conn.execute("DELETE FROM ips_bloqueadas WHERE ip = ?", (ip,))
            conn.commit()
            return 0
        return max(1, int(restante + 0.999))
    finally:
        conn.close()


def registrar_fallo(request: Request, motivo: str) -> bool:
    ip = client_ip(request)
    t = ahora()
    conn = db.get_conn()
    try:
        conn.execute("DELETE FROM intentos_fallidos WHERE ts < ?", (iso(t - datetime.timedelta(seconds=VENTANA_FALLOS_S)),))
        conn.execute("DELETE FROM ips_bloqueadas WHERE hasta <= ?", (iso(t),))
        conn.execute("INSERT INTO intentos_fallidos (ip, ts, motivo) VALUES (?, ?, ?)", (ip, iso(t), motivo))
        n = conn.execute("SELECT COUNT(*) FROM intentos_fallidos WHERE ip = ?", (ip,)).fetchone()[0]
        bloquear = n >= MAX_FALLOS
        if bloquear:
            hasta = t + datetime.timedelta(hours=_horas_bloqueo())
            conn.execute(
                "INSERT OR REPLACE INTO ips_bloqueadas (ip, desde, hasta, motivo) VALUES (?, ?, ?, ?)",
                (ip, iso(t), iso(hasta), motivo),
            )
            conn.execute("DELETE FROM intentos_fallidos WHERE ip = ?", (ip,))
        conn.commit()
    finally:
        conn.close()
    logger.warning("fallo de autenticacion ip=%s motivo=%s intentos=%d", ip, motivo, n)
    if bloquear:
        logger.warning("ip bloqueada ip=%s motivo=%s", ip, motivo)
    return bloquear


async def fallo_generico(request: Request, motivo: str) -> JSONResponse:
    registrar_fallo(request, motivo)
    if RETRASO_FALLO:
        await asyncio.sleep(RETRASO_FALLO)
    return JSONResponse({"detail": "Credenciales invalidas"}, status_code=401)


def respuesta_bloqueada(segundos: int) -> JSONResponse:
    return JSONResponse(
        {"detail": "IP bloqueada", "reintentar_en_s": segundos},
        status_code=403,
        headers={"Retry-After": str(segundos)},
    )


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def requiere_sesion(request: Request):
    cached = getattr(request.state, "sesion", False)
    if cached is not False:
        return cached
    request.state.sesion = None
    token = request.cookies.get(COOKIE)
    if not token or len(token) > 128 or not configurado():
        return None
    t = ahora()
    conn = db.get_conn()
    try:
        fila = conn.execute("SELECT * FROM sesiones WHERE token_hash = ?", (_hash_token(token),)).fetchone()
        if fila is None:
            return None
        if fila["expira"] <= iso(t):
            conn.execute("DELETE FROM sesiones WHERE id = ?", (fila["id"],))
            conn.commit()
            return None
        sesion = dict(fila)
        if fila["ultimo_uso"] <= iso(t - datetime.timedelta(seconds=60)):
            conn.execute("UPDATE sesiones SET ultimo_uso = ? WHERE id = ?", (iso(t), fila["id"]))
            conn.commit()
            sesion["ultimo_uso"] = iso(t)
    finally:
        conn.close()
    request.state.sesion = sesion
    return sesion


def crear_sesion(request: Request, response, metodo: str) -> int:
    token = secrets.token_urlsafe(32)
    t = ahora()
    expira = t + datetime.timedelta(days=SESION_DIAS)
    ip = client_ip(request)
    conn = db.get_conn()
    try:
        conn.execute("DELETE FROM sesiones WHERE expira <= ?", (iso(t),))
        cur = conn.execute(
            "INSERT INTO sesiones (token_hash, creada, expira, ultimo_uso, ip, user_agent, metodo) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (_hash_token(token), iso(t), iso(expira), iso(t), ip, request.headers.get("user-agent", "")[:200], metodo),
        )
        conn.commit()
        sesion_id = cur.lastrowid
    finally:
        conn.close()
    response.set_cookie(
        COOKIE,
        token,
        max_age=SESION_DIAS * 86400,
        path="/",
        httponly=True,
        samesite="strict",
        secure=es_https(request),
    )
    logger.info("login ok ip=%s metodo=%s", ip, metodo)
    return sesion_id


def borrar_sesion(sesion_id: int) -> None:
    conn = db.get_conn()
    try:
        conn.execute("DELETE FROM sesiones WHERE id = ?", (sesion_id,))
        conn.commit()
    finally:
        conn.close()


def _push_token_valido(request: Request) -> bool | None:
    cabecera = request.headers.get("authorization", "")
    if not cabecera.lower().startswith("bearer "):
        return None
    esperado = os.environ.get("MONI_PUSH_TOKEN", "")
    token = cabecera[7:].strip()
    if len(esperado) < 32:
        return False
    return hmac.compare_digest(token.encode(), esperado.encode())


def _ruta_normalizada(path: str) -> str:
    partes = []
    for seg in path.split("/"):
        if seg in ("", "."):
            continue
        if seg == "..":
            if partes:
                partes.pop()
            continue
        partes.append(seg)
    return "/" + "/".join(partes).lower()


def _no_autenticado() -> JSONResponse:
    return JSONResponse({"detail": "No autenticado"}, status_code=401)


async def middleware_auth(request: Request, call_next):
    raw = request.scope["path"]
    ruta = _ruta_normalizada(raw)
    if not ruta.startswith("/api"):
        return await call_next(request)
    restante = ip_bloqueada(client_ip(request))
    if restante:
        return respuesta_bloqueada(restante)
    if (request.method, raw) in PUBLICAS:
        return await call_next(request)
    if not configurado():
        return _no_autenticado()
    if requiere_sesion(request) is not None:
        return await call_next(request)
    if request.method == "POST" and ruta == PUSH_ENVIAR:
        ip = client_ip(request)
        async with lock_ip(ip):
            restante = ip_bloqueada(ip)
            if restante:
                return respuesta_bloqueada(restante)
            valido = _push_token_valido(request)
            if valido is False:
                return await fallo_generico(request, "push_token")
        if valido:
            request.state.push_token = True
            return await call_next(request)
    return _no_autenticado()


async def middleware_headers(request: Request, call_next):
    response = await call_next(request)
    h = response.headers
    h["Content-Security-Policy"] = CSP
    h["X-Frame-Options"] = "DENY"
    h["X-Content-Type-Options"] = "nosniff"
    h["Referrer-Policy"] = "no-referrer"
    h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    if es_https(request):
        h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if _ruta_normalizada(request.scope["path"]).startswith("/api"):
        h["Cache-Control"] = "no-store"
    return response


def _cli_hash() -> int:
    a = getpass.getpass("Clave: ")
    if len(a) < MIN_CLAVE:
        print(f"La clave debe tener al menos {MIN_CLAVE} caracteres", file=sys.stderr)
        return 1
    if a != getpass.getpass("Repetir clave: "):
        print("Las claves no coinciden", file=sys.stderr)
        return 1
    print(f"MONI_PASSWORD_HASH='{hash_clave(a)}'")
    return 0


def _cli_unblock(ip: str) -> int:
    ip = normalizar_ip(ip)
    db.init_db()
    conn = db.get_conn()
    try:
        n = conn.execute("DELETE FROM ips_bloqueadas WHERE ip = ?", (ip,)).rowcount
        conn.execute("DELETE FROM intentos_fallidos WHERE ip = ?", (ip,))
        conn.commit()
    finally:
        conn.close()
    print(f"{ip}: {'desbloqueada' if n else 'no estaba bloqueada'}")
    return 0


def _cli_blocked() -> int:
    db.init_db()
    conn = db.get_conn()
    try:
        filas = conn.execute("SELECT ip, desde, hasta, motivo FROM ips_bloqueadas ORDER BY desde").fetchall()
    finally:
        conn.close()
    for f in filas:
        print(f"{f['ip']}\tdesde={f['desde']}\thasta={f['hasta']}\tmotivo={f['motivo']}")
    if not filas:
        print("Sin IPs bloqueadas")
    return 0


def main(argv: list[str]) -> int:
    if argv[:1] == ["hash"] and len(argv) == 1:
        return _cli_hash()
    if argv[:1] == ["unblock"] and len(argv) == 2:
        return _cli_unblock(argv[1])
    if argv == ["blocked"]:
        return _cli_blocked()
    print("uso: python -m backend.auth hash | unblock <ip> | blocked", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
