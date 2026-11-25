import pytest

from backend.core import db
from backend.tests.conftest import CLAVE_TEST

TRUNCATE = "/api/truncate"
DETALLE = "Ingresá tu clave para confirmar esta acción"


def _motivos():
    conn = db.get_conn()
    try:
        return [f[0] for f in conn.execute("SELECT motivo FROM intentos_fallidos")]
    finally:
        conn.close()


@pytest.mark.parametrize("cuerpo", [None, {}, {"clave": None}, {"clave": ""}, {"clave": "mala"}])
def test_sin_clave_o_clave_mala_da_403_con_detalle_exacto_y_cuenta_como_step_up(client, cuerpo):
    r = client.post(TRUNCATE, json=cuerpo)
    assert r.status_code == 403 and r.json() == {"detail": DETALLE}
    assert _motivos() == ["step_up"]


def test_clave_correcta_pasa_y_no_cuenta_fallo(client):
    assert client.post(TRUNCATE, json={"clave": CLAVE_TEST}).status_code == 200
    assert _motivos() == []


def test_ip_bloqueada_responde_403_ip_bloqueada_sin_evaluar_la_clave(client):
    for _ in range(3):
        client.post(TRUNCATE, json={"clave": "mala"})
    r = client.post(TRUNCATE, json={"clave": CLAVE_TEST})
    assert r.status_code == 403 and r.json()["detail"] == "IP bloqueada"
    assert r.headers["retry-after"] == "86400"


def test_clave_de_mas_de_256_caracteres_es_422(client):
    assert client.post(TRUNCATE, json={"clave": "x" * 257}).status_code == 422
    assert _motivos() == []
