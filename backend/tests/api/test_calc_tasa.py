def test_calc_tasa(client):
    ea = client.get("/api/calc/tasa", params={"valor": 12.68, "tipo": "ea"}).json()
    assert set(ea) == {"ea", "mv"} and ea["ea"] == 12.68 and round(ea["mv"], 2) == 1.0
    mv = client.get("/api/calc/tasa", params={"valor": 1, "tipo": "mv"}).json()
    assert mv["mv"] == 1 and round(mv["ea"], 2) == 12.68
    assert client.get("/api/calc/tasa", params={"valor": 0}).json() == {"ea": None, "mv": None}
    assert client.get("/api/calc/tasa", params={"valor": 1, "tipo": "x"}).status_code == 422


def test_inv_tasa_tipo_mv_se_guarda_como_ea(client):
    base = {"nombre": "CDT", "tipo": "fija", "monto_invertido": 100, "valor_actual": 100, "tasa_ea": 1, "tasa_tipo": "mv"}
    creada = client.post("/api/inv", json=base).json()
    assert round(creada["tasa_ea"], 2) == 12.68 and "tasa_tipo" not in creada
    actualizada = client.put(f"/api/inv/{creada['id']}", json={**base, "tasa_ea": 24, "tasa_tipo": "ea"}).json()
    assert actualizada["tasa_ea"] == 24
    assert client.post("/api/inv", json={**base, "tasa_tipo": "x"}).status_code == 422
