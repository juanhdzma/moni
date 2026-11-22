def test_categorias_crud(client):
    base = client.get("/api/categorias").json()
    assert set(base) == {"ingreso", "gasto", "transfer"}
    assert base["gasto"] == [{"nombre": "Inversión", "sistema": True}, {"nombre": "Compra activos", "sistema": True}]
    r = client.post("/api/categorias", json={"tipo": "gasto", "nombre": "  Mascotas "})
    assert r.status_code == 201
    assert r.json()["gasto"][-1] == {"nombre": "Mascotas", "sistema": False}
    assert client.get("/api/categorias").json() == r.json()
    assert client.get("/api/bootstrap").json()["categorias"] == r.json()
    r = client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "Mascotas"})
    assert r.status_code == 200 and r.json() == base


def test_categorias_errores(client):
    client.post("/api/categorias", json={"tipo": "ingreso", "nombre": "Extra"})
    assert client.post("/api/categorias", json={"tipo": "ingreso", "nombre": "Extra"}).status_code == 409
    assert client.post("/api/categorias", json={"tipo": "gasto", "nombre": "Inversión"}).status_code == 409
    assert client.post("/api/categorias", json={"tipo": "gasto", "nombre": "   "}).status_code == 422
    assert client.post("/api/categorias", json={"tipo": "otro", "nombre": "x"}).status_code == 422
    assert client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "Inversión"}).status_code == 409
    assert client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "Nada"}).status_code == 404
    client.headers.pop("x-moni-request")
    assert client.post("/api/categorias", json={"tipo": "gasto", "nombre": "z"}).status_code == 403
    assert client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "z"}).status_code == 403
