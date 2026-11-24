import pytest


def test_calc_tasa(client):
    ea = client.get("/api/calc/tasa", params={"valor": 12.68, "tipo": "ea"}).json()
    assert set(ea) == {"ea", "mv", "texto"} and ea["ea"] == 12.68 and round(ea["mv"], 2) == 1.0
    assert ea["texto"] == "Equivale a 0,9998% MV"
    mv = client.get("/api/calc/tasa", params={"valor": 1, "tipo": "mv"}).json()
    assert mv["mv"] == 1 and round(mv["ea"], 2) == 12.68 and mv["texto"] == "Equivale a 12,68% EA"
    assert client.get("/api/calc/tasa", params={"valor": 0}).json() == {"ea": None, "mv": None, "texto": None}
    assert client.get("/api/calc/tasa", params={"valor": 1, "tipo": "x"}).status_code == 422


def test_calc_tasa_ida_y_vuelta_no_acumula_error_de_float(client):
    ea = client.get("/api/calc/tasa", params={"valor": 0.1, "tipo": "mv"}).json()["ea"]
    mv = client.get("/api/calc/tasa", params={"valor": ea, "tipo": "ea"}).json()["mv"]
    assert mv == pytest.approx(0.1, abs=1e-12)


@pytest.mark.parametrize("valor", ["nan", "inf", "-inf", "1e308", "1001"])
def test_calc_tasa_rechaza_valores_fuera_de_rango(client, valor):
    r = client.get("/api/calc/tasa", params={"valor": valor, "tipo": "mv"})
    assert r.status_code == 422
