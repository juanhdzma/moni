def test_migrar_local_es_idempotente_e_ignora_basura(client):
    body = {
        "categorias": {"gasto": ["Mascotas", "Inversión", "  ", "Mascotas"], "ingreso": ["Freelance"], "raro": ["x"]},
        "ops_ocultas": ["deuda:3:2026-11-25", "basura", "recurrente:1:2026-12-01"],
        "moneda_simbolo": "COP",
    }
    r = client.post("/api/migrar-local", json=body)
    assert r.status_code == 200
    assert r.json() == {"categorias": 2, "ops_ocultas": 2, "moneda_simbolo": True}
    assert client.post("/api/migrar-local", json=body).json() == {"categorias": 0, "ops_ocultas": 0, "moneda_simbolo": False}
    assert client.get("/api/ajustes").json() == {"moneda_simbolo": "COP"}
    assert client.post("/api/migrar-local", json={"moneda_simbolo": "demasiado"}).json()["moneda_simbolo"] is False
    assert client.post("/api/migrar-local", json={}).json() == {"categorias": 0, "ops_ocultas": 0, "moneda_simbolo": False}


def test_truncate_vacia_categorias_y_ops_pero_no_ajustes(client):
    client.post("/api/categorias", json={"tipo": "gasto", "nombre": "Extra"})
    client.post("/api/ops-ocultas", json={"clave": "deuda:1:2026-01-01"})
    client.put("/api/ajustes", json={"moneda_simbolo": "US$"})
    assert client.post("/api/truncate").status_code == 200
    assert client.get("/api/categorias").json()["gasto"] == [
        {"nombre": "Inversión", "sistema": True},
        {"nombre": "Compra activos", "sistema": True},
    ]
    assert client.get("/api/ops-ocultas").json() == {"items": []}
    assert client.get("/api/ajustes").json() == {"moneda_simbolo": "US$"}
