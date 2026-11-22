def test_previews_de_deuda(client, prestamo, tarjeta):
    r = client.post(f"/api/deuda/{prestamo['id']}/pago/preview", json={"total_pagado": 150_000, "nuevo_saldo": 900_000})
    assert r.status_code == 200 and r.json() == {"capital": 100_000, "intereses": 50_000}
    r = client.post(f"/api/deuda/{tarjeta['id']}/adelanto/preview", json={"monto": 100_000, "nuevo_saldo": 110_000})
    assert r.json() == {"comision": 10_000, "nuevo_saldo": 110_000}
    assert client.post("/api/deuda/999/pago/preview", json={"total_pagado": 1, "nuevo_saldo": 0}).status_code == 404
    assert client.get("/api/deudas/resumen").json()["creditos"][0]["saldo_actual"] == 1_000_000


def test_previews_de_inversion(client):
    inv = client.post("/api/inv", json={"nombre": "A", "tipo": "variable", "monto_invertido": 1000, "valor_actual": 1200}).json()
    r = client.post(f"/api/inv/{inv['id']}/valor/preview", json={"nuevo_valor": 1500})
    assert r.json() == {"delta": 300, "total": 500, "total_pct": 50.0}
    r = client.post(f"/api/inv/{inv['id']}/aporte/preview", json={"monto": 300})
    assert r.json() == {"nuevo_valor_estimado": 1500}
    assert client.post("/api/inv/999/valor/preview", json={"nuevo_valor": 1}).status_code == 404
    assert client.get("/api/inv/resumen").json()["variables"][0]["valor_actual"] == 1200


def test_previews_de_activo(client):
    a = client.post("/api/activo", json={"nombre": "Casa", "valor_inicial": 1000, "valor_actual": 1200}).json()
    r = client.post(f"/api/activo/{a['id']}/valor/preview", json={"nuevo_valor": 1500})
    assert r.json() == {"delta": 300, "total": 500, "total_pct": 50.0}
    r = client.post(f"/api/activo/{a['id']}/venta/preview", json={"precio": 1100})
    assert r.json() == {"vs_inicial": 100, "vs_actual": -100}
    assert client.post("/api/activo/999/venta/preview", json={"precio": 1}).status_code == 404
    assert client.get("/api/activos/resumen").json()["items"][0]["valor_actual"] == 1200


def test_previews_exigen_header_csrf(client, prestamo):
    client.headers.pop("x-moni-request")
    r = client.post(f"/api/deuda/{prestamo['id']}/pago/preview", json={"total_pagado": 1, "nuevo_saldo": 0})
    assert r.status_code == 403
