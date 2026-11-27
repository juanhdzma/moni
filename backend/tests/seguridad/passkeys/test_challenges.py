from webauthn.helpers import bytes_to_base64url

from backend.seguridad.passkeys import challenges as ch
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
    r = client.post(VERIFICAR_LOGIN, json=auten.firmar(opciones, 1))
    assert r.status_code == 401 and r.json() == {"detail": "El intento venció, probá de nuevo"}
    assert fallos() == 0


def test_challenge_de_otra_ip_falla(client, monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "198.51.100.0/24")
    auten, _ = alta(client)
    client.cookies.clear()
    opciones = client.post(OPCIONES_LOGIN, headers={"X-Forwarded-For": "203.0.113.1"}).json()
    r = client.post(VERIFICAR_LOGIN, json=auten.firmar(opciones, 1), headers={"X-Forwarded-For": "203.0.113.2"})
    assert r.status_code == 401
    assert fallos() == 0


def test_opciones_de_login_tienen_rate_limit_por_ip(client):
    from backend.seguridad.passkeys import rutas

    alta(client)
    client.cookies.clear()
    codigos = [client.post(OPCIONES_LOGIN).status_code for _ in range(rutas.MAX_OPCIONES + 1)]
    assert codigos == [200] * rutas.MAX_OPCIONES + [429]
    assert client.post(OPCIONES_LOGIN).headers["Retry-After"] == str(rutas.VENTANA_OPCIONES_S)


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



def _de_ip(ip):
    conn = db.get_conn()
    try:
        return [f[0] for f in conn.execute("SELECT challenge FROM challenges WHERE ip = ? ORDER BY id", (ip,))]
    finally:
        conn.close()


def test_el_sexto_challenge_de_la_misma_ip_desplaza_al_mas_viejo(client):
    alta(client)
    client.cookies.clear()
    primero = client.post(OPCIONES_LOGIN).json()
    for _ in range(4):
        client.post(OPCIONES_LOGIN)
    assert len(_de_ip("198.51.100.7")) == ch.MAX_CHALLENGES_POR_IP == 5
    assert primero["challenge"] in _de_ip("198.51.100.7")
    client.post(OPCIONES_LOGIN)
    restantes = _de_ip("198.51.100.7")
    assert len(restantes) == 5 and primero["challenge"] not in restantes


def test_el_limite_es_por_ip_y_no_toca_a_las_demas(client, monkeypatch):
    monkeypatch.setenv("MONI_TRUSTED_PROXIES", "198.51.100.0/24")
    alta(client)
    client.cookies.clear()
    for _ in range(3):
        client.post(OPCIONES_LOGIN, headers={"X-Forwarded-For": "203.0.113.1"})
    for _ in range(8):
        client.post(OPCIONES_LOGIN, headers={"X-Forwarded-For": "203.0.113.2"})
    assert len(_de_ip("203.0.113.1")) == 3 and len(_de_ip("203.0.113.2")) == 5


def test_challenge_valido_hasta_un_segundo_antes_de_expirar_y_rechazado_en_el_instante(client, reloj):
    auten, _ = alta(client)
    client.cookies.clear()
    opciones = client.post(OPCIONES_LOGIN).json()
    reloj.avanzar(seconds=ch.CHALLENGE_TTL_S - 1)
    assert client.post(VERIFICAR_LOGIN, json=auten.firmar(opciones, 1)).status_code == 200
    client.cookies.clear()
    opciones = client.post(OPCIONES_LOGIN).json()
    reloj.avanzar(seconds=ch.CHALLENGE_TTL_S)
    assert client.post(VERIFICAR_LOGIN, json=auten.firmar(opciones, 2)).status_code == 401


def test_guardar_challenge_purga_los_vencidos_justo_ahora(client, reloj):
    alta(client)
    client.cookies.clear()
    client.post(OPCIONES_LOGIN)
    reloj.avanzar(seconds=ch.CHALLENGE_TTL_S)
    client.post(OPCIONES_LOGIN)
    assert len(_de_ip("198.51.100.7")) == 1


def test_consumir_challenge_con_credencial_malformada_es_none():
    for cred in ({}, {"response": {}}, {"response": {"clientDataJSON": "!!!"}}, {"response": {"clientDataJSON": "e30"}}):
        assert ch.consumir_challenge(cred, "login", "1.1.1.1") is None
    from webauthn.helpers import bytes_to_base64url

    numerico = bytes_to_base64url(b'{"challenge": 5}')
    assert ch.consumir_challenge({"response": {"clientDataJSON": numerico}}, "login", "1.1.1.1") is None


def test_ttl_y_limite_por_defecto():
    assert (ch.CHALLENGE_TTL_S, ch.MAX_CHALLENGES_POR_IP) == (300, 5)
