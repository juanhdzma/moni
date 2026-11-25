import functools
import ipaddress
import logging
import os

from fastapi import Request

logger = logging.getLogger("moni.auth")

DEFAULT_PROXIES = "127.0.0.0/8,::1/128"


@functools.lru_cache(maxsize=8)
def _redes(csv: str):
    return tuple(ipaddress.ip_network(p.strip(), strict=False) for p in csv.split(",") if p.strip())


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


def _es_ip(valor: str) -> bool:
    try:
        ipaddress.ip_address(valor)
    except ValueError:
        return False
    return True


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


_xff_avisado = False


def _avisar_xff_de_peer_no_confiable(request: Request) -> None:
    global _xff_avisado
    if _xff_avisado or "MONI_TRUSTED_PROXIES" in os.environ or not request.headers.getlist("x-forwarded-for"):
        return
    _xff_avisado = True
    logger.warning(
        "llega X-Forwarded-For desde peer=%s que no es proxy confiable; "
        "si hay un reverse proxy, definí MONI_TRUSTED_PROXIES o todos los clientes comparten una IP",
        _peer(request),
    )


def client_ip(request: Request) -> str:
    peer = _peer(request)
    redes = _proxies_confiables()
    if peer and not _es_confiable(peer, redes):
        _avisar_xff_de_peer_no_confiable(request)
    if peer and _es_confiable(peer, redes):
        xff = ",".join(request.headers.getlist("x-forwarded-for"))
        partes = [p.strip() for p in xff.split(",") if _es_ip(p.strip())]
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
