from backend.tests.conftest import CLAVE_TEST
from backend.core import db
from backend.tests.seguridad.passkeys.helpers import alta, fallos, OPCIONES_REGISTRO, OPCIONES_LOGIN, VERIFICAR_LOGIN


def test_challenge_reusado_falla(client):
    auten, _ = alta(client)
    client.cookies.clear()
    opciones = client.post(OPCIONES_LOGIN).json()
    cred = auten.firmar(opciones, 1)
    assert client.post(VERIFICAR_LOGIN, json=cred).status_code == 200
    client.cookies.clear()
    r = client.post(VERIFICAR_LOGIN, json=auten.firmar(opciones, 2))
    assert r.status_code == 401 and r.json() == {"detail": "Credenciales inválidas"}
    assert fallos() == 1


def test_challenge_expirado_falla(client):
    auten, _ = alta(client)
    client.cookies.clear()
    opciones = client.post(OPCIONES_LOGIN).json()
    conn = db.get_conn()
    conn.execute("UPDATE challenges SET expira = '2000-01-01T00:00:00'")
    conn.commit()
    conn.close()
    assert client.post(VERIFICAR_LOGIN, json=auten.firmar(opciones, 1)).status_code == 401
    assert fallos() == 1


def test_challenge_de_otra_ip_falla(client, monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "198.51.100.0/24")
    auten, _ = alta(client)
    client.cookies.clear()
    opciones = client.post(OPCIONES_LOGIN, headers={"X-Forwarded-For": "203.0.113.1"}).json()
    r = client.post(VERIFICAR_LOGIN, json=auten.firmar(opciones, 1), headers={"X-Forwarded-For": "203.0.113.2"})
    assert r.status_code == 401


def test_challenge_de_registro_no_sirve_para_login(client):
    auten, _ = alta(client)
    opciones = client.post(OPCIONES_REGISTRO, json={"clave": CLAVE_TEST}).json()
    client.cookies.clear()
    assert client.post(VERIFICAR_LOGIN, json=auten.firmar(opciones, 1)).status_code == 401


def test_challenges_por_ip_acotados(anon_client, client):
    alta(client)
    client.cookies.clear()
    for _ in range(12):
        client.post(OPCIONES_LOGIN)
    conn = db.get_conn()
    assert conn.execute("SELECT COUNT(*) FROM challenges").fetchone()[0] <= 5
    conn.close()
