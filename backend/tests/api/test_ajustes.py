def test_ajustes(client):
    assert client.get("/api/ajustes").json() == {"moneda_simbolo": "$"}
    assert client.put("/api/ajustes", json={"moneda_simbolo": " US$ "}).json() == {"moneda_simbolo": "US$"}
    assert client.get("/api/ajustes").json() == {"moneda_simbolo": "US$"}
    assert client.get("/api/all").json()["ajustes"] == {"moneda_simbolo": "US$"}
    for malo in ["", "   ", "12345", "a\nb"]:
        assert client.put("/api/ajustes", json={"moneda_simbolo": malo}).status_code == 422
    client.headers.pop("x-moni-request")
    assert client.put("/api/ajustes", json={"moneda_simbolo": "$"}).status_code == 403
