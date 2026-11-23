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
    assert client.get("/api/bootstrap").json()["ajustes"] == {"moneda_simbolo": "COP"}
    assert client.post("/api/migrar-local", json={"moneda_simbolo": "demasiado"}).json()["moneda_simbolo"] is False
    assert client.post("/api/migrar-local", json={}).json() == {"categorias": 0, "ops_ocultas": 0, "moneda_simbolo": False}
