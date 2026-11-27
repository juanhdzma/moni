def test_categorias_crud(client):
    base = client.get("/api/bootstrap").json()["categorias"]
    assert set(base) == {"ingreso", "gasto", "transfer"}
    assert base["gasto"] == [{"nombre": "Inversión", "sistema": True}, {"nombre": "Compra activos", "sistema": True}]
    r = client.post("/api/categorias", json={"tipo": "gasto", "nombre": "  Mascotas "})
    assert r.status_code == 201
    assert r.json()["gasto"][-1] == {"nombre": "Mascotas", "sistema": False}
    assert client.get("/api/bootstrap").json()["categorias"] == r.json()
    r = client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "Mascotas"})
    assert r.status_code == 204 and r.content == b""
    assert client.get("/api/bootstrap").json()["categorias"] == base


def test_categorias_errores(client):
    client.post("/api/categorias", json={"tipo": "ingreso", "nombre": "Extra"})
    assert client.post("/api/categorias", json={"tipo": "ingreso", "nombre": "Extra"}).status_code == 409
    assert client.post("/api/categorias", json={"tipo": "gasto", "nombre": "Inversión"}).status_code == 409
    assert client.post("/api/categorias", json={"tipo": "gasto", "nombre": "   "}).status_code == 422
    assert client.post("/api/categorias", json={"tipo": "otro", "nombre": "x"}).status_code == 422
    assert client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "Inversión"}).status_code == 409
    assert client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "Nada"}).status_code == 404


def test_categorias_errores_en_espanol_con_su_status(client):
    r = client.post("/api/categorias", json={"tipo": "gasto", "nombre": "Inversión"})
    assert (r.status_code, r.json()) == (409, {"detail": "Categoría repetida"})
    r = client.post("/api/categorias", json={"tipo": "gasto", "nombre": "  "})
    assert (r.status_code, r.json()) == (422, {"detail": "Nombre vacío"})
    r = client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "Inversión"})
    assert (r.status_code, r.json()) == (409, {"detail": "Las categorías de sistema no se pueden borrar"})
    r = client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "Nada"})
    assert (r.status_code, r.json()) == (404, {"detail": "Categoría no encontrada"})


def test_nombre_de_categoria_de_sistema_se_rechaza_en_cualquier_tipo(client):
    for tipo, nombre in [("gasto", "Intereses"), ("ingreso", "Inversión"), ("gasto", "Pago deuda"), ("transfer", "Dividendos")]:
        r = client.post("/api/categorias", json={"tipo": tipo, "nombre": nombre})
        assert (r.status_code, r.json()) == (409, {"detail": "Categoría repetida"}), (tipo, nombre)


def test_categoria_demasiado_larga_es_422(client):
    r = client.post("/api/categorias", json={"tipo": "gasto", "nombre": "x" * 26})
    assert (r.status_code, r.json()) == (422, {"detail": "Nombre demasiado largo (máximo 25 caracteres)"})
