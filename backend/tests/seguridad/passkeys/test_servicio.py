import pytest
from webauthn.helpers import bytes_to_base64url

from backend.core import db
from backend.seguridad.passkeys import servicio
from backend.tests.conftest import CLAVE_TEST
from backend.tests.seguridad.passkeys.helpers import (
    OPCIONES_LOGIN, OPCIONES_REGISTRO, VERIFICAR_REGISTRO, Autenticador, alta, intento_login,
)


def _passkeys():
    conn = db.get_conn()
    try:
        return [dict(f) for f in conn.execute("SELECT * FROM passkeys")]
    finally:
        conn.close()


def _challenges():
    conn = db.get_conn()
    try:
        return [dict(f) for f in conn.execute("SELECT tipo, ip, expira FROM challenges ORDER BY id")]
    finally:
        conn.close()


def test_registro_persiste_credencial_clave_publica_contador_transportes_nombre_y_fecha(client, reloj):
    auten = Autenticador()
    auten.sign_count = 3
    opciones = client.post(OPCIONES_REGISTRO, json={"clave": CLAVE_TEST}).json()
    r = client.post(VERIFICAR_REGISTRO, json={**auten.registrar(opciones), "nombre": "  Mac  "})
    fila = _passkeys()[0]
    assert r.json() == {"ok": True, "id": fila["id"]}
    assert fila["credential_id"] == bytes_to_base64url(auten.credential_id)
    assert fila["public_key"] and fila["public_key"] != fila["credential_id"]
    assert fila["sign_count"] == 3
    assert fila["transportes"] == "internal"
    assert fila["nombre"] == "Mac"
    assert fila["creada"] == "2026-01-01T12:00:00"
    assert fila["ultimo_uso"] == ""


def test_registro_descarta_transportes_desconocidos_o_no_texto(client):
    auten = Autenticador()
    opciones = client.post(OPCIONES_REGISTRO, json={"clave": CLAVE_TEST}).json()
    cred = auten.registrar(opciones)
    cred["response"]["transports"] = ["usb", "evil", 5, "hybrid"]
    assert client.post(VERIFICAR_REGISTRO, json={**cred, "nombre": "k"}).status_code == 200
    assert _passkeys()[0]["transportes"] == "usb,hybrid"


def test_login_persiste_sign_count_y_ultimo_uso(client, reloj):
    auten, _ = alta(client)
    client.cookies.clear()
    assert client.get("/api/auth/estado").json()["autenticado"] is False
    assert client.post("/api/auth/login", json={"clave": CLAVE_TEST}).status_code == 200
    assert client.get("/api/auth/passkeys").json()[0]["ultimo_uso_texto"] == "nunca"
    client.cookies.clear()
    reloj.avanzar(hours=2)
    assert intento_login(client, auten, 5).status_code == 200
    fila = _passkeys()[0]
    assert fila["sign_count"] == 5
    assert fila["ultimo_uso"] == "2026-01-01T14:00:00"
    lista = client.get("/api/auth/passkeys").json()
    assert lista[0]["ultimo_uso_texto"] == "2026-01-01 09:00"
    assert lista[0]["creada_texto"] == "2026-01-01 07:00"


def test_login_rechazado_por_contador_decreciente_no_cambia_la_fila(client, reloj):
    auten, _ = alta(client)
    client.cookies.clear()
    assert intento_login(client, auten, 5).status_code == 200
    antes = _passkeys()[0]
    client.cookies.clear()
    reloj.avanzar(hours=1)
    r = intento_login(client, auten, 2)
    assert r.status_code == 401 and r.json() == {"detail": "Credenciales inválidas"}
    assert _passkeys()[0] == antes
    assert client.get("/api/backup").status_code == 401


def test_login_crea_sesion_con_metodo_passkey(client):
    auten, _ = alta(client)
    client.cookies.clear()
    intento_login(client, auten, 1)
    conn = db.get_conn()
    assert [f[0] for f in conn.execute("SELECT metodo FROM sesiones WHERE metodo = 'passkey'")] == ["passkey"]
    conn.close()


def test_opciones_login_y_registro_responden_application_json(client):
    assert client.post(OPCIONES_REGISTRO, json={"clave": CLAVE_TEST}).headers["content-type"] == "application/json"
    alta(client)
    client.cookies.clear()
    assert client.post(OPCIONES_LOGIN).headers["content-type"] == "application/json"


def test_login_sin_passkeys_detalle_exacto(anon_client):
    r = anon_client.post(OPCIONES_LOGIN)
    assert r.status_code == 404 and r.json() == {"detail": "Sin passkeys"}


def test_opciones_de_registro_con_rp_por_defecto_y_usuario_fijo(client, monkeypatch):
    monkeypatch.delenv("MONI_RP_ID")
    monkeypatch.delenv("MONI_ORIGIN")
    o = client.post(OPCIONES_REGISTRO, json={"clave": CLAVE_TEST}).json()
    assert o["rp"] == {"name": "Moni", "id": "moni.nufi.com.co"}
    assert o["user"] == {"id": bytes_to_base64url(servicio.USER_ID), "name": "moni", "displayName": "Moni"}
    assert o["authenticatorSelection"] == {
        "authenticatorAttachment": "platform", "residentKey": "preferred", "requireResidentKey": False,
        "userVerification": "required",
    }
    assert servicio.origen() == "https://moni.nufi.com.co" and servicio.rp_id() == "moni.nufi.com.co"


def test_rp_id_y_origen_se_recortan(monkeypatch):
    monkeypatch.setenv("MONI_RP_ID", "  ejemplo.com ")
    monkeypatch.setenv("MONI_ORIGIN", " https://ejemplo.com  ")
    assert servicio.rp_id() == "ejemplo.com" and servicio.origen() == "https://ejemplo.com"


def test_opciones_de_login_traen_rp_y_verificacion_obligatoria(client, monkeypatch):
    auten, _ = alta(client)
    client.cookies.clear()
    monkeypatch.setenv("MONI_RP_ID", "otro.example")
    o = client.post(OPCIONES_LOGIN).json()
    assert o["rpId"] == "otro.example" and o["userVerification"] == "required"
    assert o["allowCredentials"] == [
        {"id": bytes_to_base64url(auten.credential_id), "type": "public-key", "transports": ["internal"]}
    ]


def test_credencial_sin_transportes_no_los_declara_en_las_opciones(client):
    auten, _ = alta(client)
    conn = db.get_conn()
    conn.execute("UPDATE passkeys SET transportes = ''")
    conn.commit()
    conn.close()
    client.cookies.clear()
    credencial = client.post(OPCIONES_LOGIN).json()["allowCredentials"][0]
    assert "transports" not in credencial


@pytest.mark.parametrize("cuerpo,estado,detalle", [({}, 400, "Registro inválido")])
def test_registro_sin_challenge_valido_detalle_exacto(client, cuerpo, estado, detalle):
    r = client.post(VERIFICAR_REGISTRO, json={**cuerpo, "nombre": "x"})
    assert r.status_code == estado and r.json() == {"detail": detalle}


def test_registro_duplicado_y_limite_con_detalle_exacto(client):
    auten, _ = alta(client)
    o = client.post(OPCIONES_REGISTRO, json={"clave": CLAVE_TEST}).json()
    r = client.post(VERIFICAR_REGISTRO, json={**auten.registrar(o), "nombre": "x"})
    assert r.status_code == 409 and r.json() == {"detail": "Passkey ya registrado"}
    for i in range(9):
        alta(client, nombre=f"d{i}")
    r = client.post(OPCIONES_REGISTRO, json={"clave": CLAVE_TEST})
    assert r.status_code == 409 and r.json() == {"detail": "Límite de passkeys alcanzado"}


def test_borrar_passkey_inexistente_detalle_exacto(client):
    r = client.delete("/api/auth/passkeys/999")
    assert r.status_code == 404 and r.json() == {"detail": "Passkey no encontrado"}


def test_nombre_invalido_responde_detalle_en_lista(client):
    r = client.post(VERIFICAR_REGISTRO, json={"nombre": ""})
    assert r.status_code == 422
    assert r.json() == {"detail": [{"loc": ["body", "nombre"], "msg": "Nombre inválido", "type": "value_error"}]}


def test_nombre_de_40_caracteres_se_acepta_y_de_41_no(client):
    assert alta(client, nombre="n" * 40)[1].status_code == 200
    auten = Autenticador()
    o = client.post(OPCIONES_REGISTRO, json={"clave": CLAVE_TEST}).json()
    assert client.post(VERIFICAR_REGISTRO, json={**auten.registrar(o), "nombre": "n" * 41}).status_code == 422


def test_los_challenges_guardados_llevan_tipo_ip_y_expiracion_de_5_minutos(client, reloj):
    client.post(OPCIONES_REGISTRO, json={"clave": CLAVE_TEST})
    assert _challenges() == [{"tipo": "registro", "ip": "198.51.100.7", "expira": "2026-01-01T12:05:00"}]


def test_opciones_de_login_declaran_todos_los_transportes_guardados(client):
    alta(client)
    conn = db.get_conn()
    conn.execute("UPDATE passkeys SET transportes = 'usb,internal,otro'")
    conn.commit()
    conn.close()
    client.cookies.clear()
    credencial = client.post(OPCIONES_LOGIN).json()["allowCredentials"][0]
    assert credencial["transports"] == ["usb", "internal"]


def test_verificar_login_con_id_que_no_es_texto_o_desconocido_es_false(client):
    alta(client)
    for cred in ({}, {"id": 5}, {"id": None}, {"id": "desconocido"}):
        assert servicio.verificar_login(cred, b"x") is False


def test_registrar_con_el_cupo_lleno_justo_en_el_limite_responde_409_y_no_inserta(client):
    auten = Autenticador()
    opciones = client.post(OPCIONES_REGISTRO, json={"clave": CLAVE_TEST}).json()
    conn = db.get_conn()
    for i in range(servicio.MAX_PASSKEYS):
        conn.execute("INSERT INTO passkeys (credential_id, public_key, sign_count, transportes, nombre, creada) VALUES (?, 'k', 0, '', 'n', 't')", (f"c{i}",))
    conn.commit()
    conn.close()
    r = client.post(VERIFICAR_REGISTRO, json={**auten.registrar(opciones), "nombre": "x"})
    assert r.status_code == 409 and r.json() == {"detail": "Límite de passkeys alcanzado"}
    assert len(_passkeys()) == servicio.MAX_PASSKEYS
