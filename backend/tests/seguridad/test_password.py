import base64
import hashlib

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
    assert anon_client.get("/api/backup").status_code == 401
    assert anon_client.get("/api/auth/estado").json()["configurado"] is False


def test_sin_hash_nadie_entra(anon_client, client, monkeypatch):
    monkeypatch.delenv("MONI_PASSWORD_HASH")
    r = login(anon_client)
    assert r.status_code == 503 and r.json() == {"detail": "Autenticación sin configurar"}
    assert client.get("/api/backup").status_code == 401
    assert sesiones.COOKIE not in r.cookies


def test_clave_mala_generica(anon_client):
    r = login(anon_client, "mala")
    assert r.status_code == 401 and r.json() == {"detail": "Credenciales inválidas"}
    assert anon_client.get("/api/backup").status_code == 401


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
    assert client.get("/api/backup").status_code == 200
    monkeypatch.delenv("MONI_PASSWORD_HASH")
    assert client.get("/api/backup").status_code == 401


B64_OK = base64.b64encode(b"0123456789abcdef").decode()


def _hash(n=2**15, r=8, p=1, salt=B64_OK, h=B64_OK, esquema="scrypt"):
    return f"{esquema}${n}${r}${p}${salt}${h}"


def test_hash_clave_formato_parametros_y_largos():
    esquema, n, r, p, salt, h = password.hash_clave("clave-larga-de-prueba").split("$")
    assert (esquema, n, r, p) == ("scrypt", "32768", "8", "1")
    assert len(base64.b64decode(salt, validate=True)) == 16
    assert len(base64.b64decode(h, validate=True)) == 32


def test_hash_clave_usa_sal_aleatoria():
    assert password.hash_clave("misma-clave-larga") != password.hash_clave("misma-clave-larga")


def test_parse_hash_valido_devuelve_parametros_y_bytes():
    assert password._parse_hash(_hash(n=1024, r=4, p=2)) == (1024, 4, 2, b"0123456789abcdef", b"0123456789abcdef")


@pytest.mark.parametrize(
    "valor",
    [
        _hash(salt=""),
        _hash(h=""),
        _hash(salt="", h=""),
        _hash(salt="QUJD!"),
        _hash(h="QUJD!"),
        _hash(n=0),
        _hash(n=1),
        _hash(n=6),
        _hash(n=-8),
        _hash(r=0),
        _hash(r=-1),
        _hash(p=0),
        _hash(n="x"),
        _hash(r="1.5"),
        _hash(esquema="SCRYPT"),
        "scrypt$32768$8$1$" + B64_OK,
        _hash() + "$extra",
        "",
    ],
)
def test_parse_hash_malformado_es_none(valor):
    assert password._parse_hash(valor) is None


def test_parse_hash_acepta_n_igual_a_2_y_r_p_iguales_a_1():
    assert password._parse_hash(_hash(n=2, r=1, p=1)) is not None


def test_hash_con_salt_o_digest_vacio_no_cuenta_como_configurado(monkeypatch):
    for valor in (_hash(salt=""), _hash(h=""), _hash(salt="QUJD!")):
        monkeypatch.setenv("MONI_PASSWORD_HASH", valor)
        assert password.configurado() is False


@pytest.mark.parametrize("envoltura", ["{}", "'{}'", '"{}"', "  '{}'  ", " \"{}\" "])
def test_hash_configurado_quita_comillas_y_espacios(monkeypatch, envoltura):
    monkeypatch.setenv("MONI_PASSWORD_HASH", envoltura.format(_hash(n=1024)))
    assert password._hash_configurado()[0] == 1024


def test_hash_configurado_sin_variable_es_none(monkeypatch):
    monkeypatch.delenv("MONI_PASSWORD_HASH", raising=False)
    assert password._hash_configurado() is None and password.configurado() is False
    assert password.verificar_clave(CLAVE_TEST) is False


def test_verificar_clave_usa_el_largo_del_digest_guardado(monkeypatch):
    salt = b"sal-de-16-bytes!"
    corto = hashlib.scrypt(b"clave-x", salt=salt, n=1024, r=8, p=1, dklen=16)
    monkeypatch.setenv("MONI_PASSWORD_HASH", _hash(n=1024, salt=base64.b64encode(salt).decode(), h=base64.b64encode(corto).decode()))
    assert password.verificar_clave("clave-x") is True
    assert password.verificar_clave("clave-y") is False


def test_verificar_clave_con_parametros_imposibles_es_false_y_no_lanza(monkeypatch):
    monkeypatch.setenv("MONI_PASSWORD_HASH", _hash(n=2**30, r=8))
    assert password.configurado() is True
    assert password.verificar_clave("cualquiera") is False


def test_verificar_clave_con_digest_modificado_es_false(monkeypatch):
    partes = password.hash_clave("clave-larga-de-prueba").split("$")
    partes[5] = base64.b64encode(b"\0" * 32).decode()
    monkeypatch.setenv("MONI_PASSWORD_HASH", "$".join(partes))
    assert password.verificar_clave("clave-larga-de-prueba") is False


def test_min_clave_es_12():
    assert password.MIN_CLAVE == 12


def test_hash_configurado_no_recorta_una_x_final_del_digest(monkeypatch):
    monkeypatch.setenv("MONI_PASSWORD_HASH", _hash(n=1024, h="AAAX"))
    assert password._hash_configurado() == (1024, 8, 1, b"0123456789abcdef", b"\x00\x00\x17")
