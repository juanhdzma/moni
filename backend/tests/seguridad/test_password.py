import pytest

from backend.seguridad import password, sesiones
from backend.tests.conftest import CLAVE_TEST
from backend.tests.seguridad.helpers import login


def test_hash_roundtrip(monkeypatch):
    h = password.hash_clave("otra-clave-larga-1")
    assert h.startswith("scrypt$")
    monkeypatch.setenv("MONI_PASSWORD_HASH", h)
    assert password.verificar_clave("otra-clave-larga-1")
    assert not password.verificar_clave("otra-clave-larga-2")


@pytest.mark.parametrize("valor", ["", "basura", "scrypt$x$8$1$AA==$AA==", "bcrypt$1$2$3$AA==$AA==", "scrypt$3$8$1$AA==$AA=="])
def test_hash_invalido_falla_cerrado(anon_client, monkeypatch, valor):
    monkeypatch.setenv("MONI_PASSWORD_HASH", valor)
    assert not password.configurado()
    assert not password.verificar_clave(CLAVE_TEST)
    assert login(anon_client).status_code == 503
    assert anon_client.get("/api/all").status_code == 401
    assert anon_client.get("/api/auth/estado").json()["configurado"] is False


def test_sin_hash_nadie_entra(anon_client, client, monkeypatch):
    monkeypatch.delenv("MONI_PASSWORD_HASH")
    r = login(anon_client)
    assert r.status_code == 503 and r.json() == {"detail": "Autenticacion sin configurar"}
    assert client.get("/api/all").status_code == 401
    assert sesiones.COOKIE not in r.cookies


def test_clave_mala_generica(anon_client):
    r = login(anon_client, "mala")
    assert r.status_code == 401 and r.json() == {"detail": "Credenciales invalidas"}
    assert anon_client.get("/api/all").status_code == 401


def test_clave_valida_longitud(anon_client):
    assert login(anon_client, "").status_code == 422
    assert login(anon_client, "x" * 257).status_code == 422


def test_hash_con_comillas_en_env_funciona(anon_client, monkeypatch):
    import os

    monkeypatch.setenv("MONI_PASSWORD_HASH", "'" + os.environ["MONI_PASSWORD_HASH"] + "'")
    assert login(anon_client).status_code == 200


def test_la_clave_no_se_loguea(anon_client, caplog):
    caplog.set_level("DEBUG")
    login(anon_client, "super-secreta-mala")
    login(anon_client)
    assert "super-secreta-mala" not in caplog.text and CLAVE_TEST not in caplog.text
    assert anon_client.cookies.get(sesiones.COOKIE) not in caplog.text


def test_sesion_invalida_si_se_quita_la_config(client, monkeypatch):
    assert client.get("/api/all").status_code == 200
    monkeypatch.delenv("MONI_PASSWORD_HASH")
    assert client.get("/api/all").status_code == 401
