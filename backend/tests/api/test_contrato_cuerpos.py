import pytest

from .builders_api import HOY_ISO


def _hidden(client):
    return [i["clave"] for i in client.get("/api/ops-ocultas").json()["items"]]


@pytest.mark.parametrize("metodo", ["post", "put"])
def test_deuda_acepta_tasa_mv_y_guarda_ea_redondeada(client, metodo):
    cuerpo = {"nombre": "D", "saldo_actual": 1000, "monto_inicial": 1000, "tasa_ea": 2, "tasa_tipo": "mv"}
    if metodo == "post":
        r = client.post("/api/deuda", json=cuerpo)
    else:
        base = client.post("/api/deuda", json={"nombre": "D", "saldo_actual": 1000}).json()
        r = client.put(f"/api/deuda/{base['id']}", json=cuerpo)
    assert r.status_code == 200, r.text
    assert r.json()["tasa_ea"] == 26.82
    assert "tasa_tipo" not in r.json()


def test_fecha_opcional_en_rendimiento_aporte_y_retiro(client):
    inv = client.post("/api/inv", json={"nombre": "I", "tipo": "variable", "monto_invertido": 1000, "valor_actual": 1000}).json()
    for accion, cuerpo in [
        ("rendimiento", {"monto": 10}),
        ("aporte", {"monto": 10}),
        ("retiro", {"tipo": "parcial", "monto": 10, "saldo_queda": 500}),
    ]:
        assert client.post(f"/api/inv/{inv['id']}/{accion}", json=cuerpo).status_code == 200, accion
    fechas = [t["fecha"] for t in client.get("/api/backup").json()["transacciones"]]
    assert fechas == ["2026-07-15T10:30"] * 3


def _acciones(client):
    inv = client.post("/api/inv", json={"nombre": "I", "tipo": "variable", "monto_invertido": 1000, "valor_actual": 1000}).json()
    activo = client.post("/api/activo", json={"nombre": "A", "valor_inicial": 100, "valor_actual": 100}).json()
    deuda = client.post("/api/deuda", json={"nombre": "D", "saldo_actual": 1000, "monto_inicial": 1000}).json()
    tarjeta = client.post("/api/deuda", json={"nombre": "T", "clase_deuda": "tarjeta", "cupo": 1000}).json()
    return [
        (f"/api/deuda/{deuda['id']}/pago", {"modo": "abono", "nuevo_saldo": 900, "total_pagado": 100, "fecha": HOY_ISO}, True),
        (f"/api/deuda/{tarjeta['id']}/adelanto", {"monto": 10, "nuevo_saldo": 10, "fecha": HOY_ISO}, False),
        (f"/api/inv/{inv['id']}/rendimiento", {"monto": 10}, True),
        (f"/api/inv/{inv['id']}/aporte", {"monto": 10}, False),
        (f"/api/inv/{inv['id']}/retiro", {"tipo": "parcial", "monto": 10, "saldo_queda": 500}, False),
        (f"/api/inv/{inv['id']}/valor", {"nuevo_valor": 900}, False),
        (f"/api/activo/{activo['id']}/valor", {"nuevo_valor": 90}, False),
        (f"/api/activo/{activo['id']}/venta", {"precio": 90}, False),
    ]


def test_op_clave_solo_se_acepta_donde_se_consume(client):
    for n, (url, cuerpo, consume) in enumerate(_acciones(client)):
        clave = f"deuda:{n}:2026-01-01"
        r = client.post(url, json={**cuerpo, "op_clave": clave})
        assert r.status_code == (200 if consume else 422), (url, r.text)
        assert (clave in _hidden(client)) == consume, url
