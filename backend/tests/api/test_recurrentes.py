REC = {"nombre": "Netflix", "tipo": "gasto", "monto": 30_000, "frecuencia": "mensual", "fecha_inicio": "2026-08-20"}


def _crear(client, **extra):
    r = client.post("/api/rec", json={**REC, **extra})
    assert r.status_code == 200, r.text
    return r.json()


def test_pausar_alterna_y_devuelve_el_nuevo_estado(client):
    rec = _crear(client)
    assert rec["activo"] == 1
    r = client.post(f"/api/rec/{rec['id']}/pausar")
    assert r.json() == {"id": rec["id"], "activo": False}
    assert client.post(f"/api/rec/{rec['id']}/pausar").json()["activo"] is True


def test_pausar_inexistente_da_404(client):
    assert client.post("/api/rec/999/pausar").status_code == 404


def test_editar_sin_activo_conserva_el_estado(client):
    rec = _crear(client, activo=False)
    r = client.put(f"/api/rec/{rec['id']}", json={**REC, "monto": 40_000})
    assert r.json()["activo"] == 0 and r.json()["monto"] == 40_000


def test_editar_con_activo_explicito_lo_aplica(client):
    rec = _crear(client, activo=False)
    r = client.put(f"/api/rec/{rec['id']}", json={**REC, "activo": True})
    assert r.json()["activo"] == 1


def test_resumen_y_detalle_exponen_categoria_sugerida(client):
    cats = client.get("/api/bootstrap").json()["categorias"]
    conocida = cats["ingreso"][0]["nombre"]
    propia = _crear(client, nombre=conocida, tipo="ingreso")
    _crear(client, nombre="Inventado")
    resumen = client.get("/api/rec/resumen").json()
    assert "frecuencias" not in resumen
    assert client.get(f"/api/rec/{propia['id']}").json()["categoria_sugerida"] == conocida
    assert resumen["ingresos"][0]["categoria_sugerida"] == conocida
    assert resumen["gastos"][0]["categoria_sugerida"] == cats["gasto"][-1]["nombre"]


def test_validacion_de_dominio_en_422(client):
    assert client.post("/api/rec", json={**REC, "monto": 0}).status_code == 422
    assert client.post("/api/rec", json={**REC, "nombre": ""}).status_code == 422
    assert client.post("/api/rec", json={**REC, "frecuencia": "diaria"}).status_code == 422


def test_activo_por_defecto_y_update_sin_activo_lo_conserva(client):
    body = {"nombre": "Netflix", "tipo": "gasto", "monto": 10, "frecuencia": "mensual"}
    rec = client.post("/api/rec", json=body).json()
    assert rec["activo"] == 1 or rec["activo"] is True
    client.post(f"/api/rec/{rec['id']}/pausar")
    editado = client.put(f"/api/rec/{rec['id']}", json={**body, "monto": 20}).json()
    assert editado["monto"] == 20 and not editado["activo"]
