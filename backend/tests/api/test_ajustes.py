def test_ajustes(client):
    assert client.get("/api/bootstrap").json()["ajustes"] == {"moneda_simbolo": "$"}
    assert client.put("/api/ajustes", json={"moneda_simbolo": " US$ "}).json() == {"moneda_simbolo": "US$"}
    assert client.get("/api/bootstrap").json()["ajustes"] == {"moneda_simbolo": "US$"}
    assert client.get("/api/bootstrap").json()["ajustes"] == {"moneda_simbolo": "US$"}
    for malo in ["", "   ", "12345", "a\nb"]:
        assert client.put("/api/ajustes", json={"moneda_simbolo": malo}).status_code == 422
