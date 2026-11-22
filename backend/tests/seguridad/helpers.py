from fastapi.testclient import TestClient

from backend import main
from backend.core.csrf import CSRF_HEADER
from backend.tests.conftest import CLAVE_TEST, IP_TEST

H = {CSRF_HEADER: "1"}


def login(c, clave=CLAVE_TEST):
    return c.post("/api/auth/login", json={"clave": clave})


def cliente(ip=IP_TEST, **headers):
    c = TestClient(main.app, client=ip)
    c.headers.update({**H, **headers})
    return c
