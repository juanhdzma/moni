from urllib.parse import urlsplit

from urllib3.util import parse_url

# Un endpoint arbitrario haría que el server le hiciera POST a cualquier URL (SSRF):
# solo se aceptan los servicios de push de los navegadores.
PUSH_HOSTS = ("fcm.googleapis.com", "push.apple.com", "push.services.mozilla.com", "notify.windows.com")


def endpoint_permitido(endpoint: str) -> bool:
    if "\\" in endpoint:
        return False
    try:
        u = urlsplit(endpoint)
        host_urllib3 = parse_url(endpoint).host or ""
        if u.username or u.password or u.port not in (None, 443):
            return False
    except ValueError:
        return False
    host = u.hostname or ""
    if host != host_urllib3.lower():
        return False
    return u.scheme == "https" and any(host == h or host.endswith("." + h) for h in PUSH_HOSTS)
