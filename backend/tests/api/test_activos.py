from .builders_api import HOY_ISO, fila_guardada


def _actualizado_en(client, activo_id):
    return fila_guardada(client, "activos", activo_id)["valor_actualizado_en"]


def _crear(client, **kw):
    r = client.post("/api/activo", json={"nombre": "Moto", "valor_inicial": 5000, **kw})
    assert r.status_code == 200, r.text
    return r.json()


def test_crear_defaultea_valor_actual_y_fechas(client):
    a = _crear(client)
    assert (a["valor_actual"], a["fecha_adquisicion"], _actualizado_en(client, a["id"])) == (5000, HOY_ISO, HOY_ISO)


def test_crear_respeta_lo_enviado(client):
    a = _crear(client, valor_actual=4000, fecha_adquisicion="2026-01-02")
    assert (a["valor_actual"], a["fecha_adquisicion"], _actualizado_en(client, a["id"])) == (4000, "2026-01-02", "2026-01-02")


def test_crear_con_tx_usa_la_fecha_resuelta(client):
    _crear(client, crear_tx=True)
    tx = client.get("/api/backup").json()["transacciones"][0]
    assert (tx["fecha"], tx["monto"], tx["categoria"]) == (HOY_ISO, 5000, "Compra activos")


def test_precio_de_compra_requerido_lo_valida_pydantic(client):
    assert client.post("/api/activo", json={"nombre": "X", "valor_inicial": 0}).status_code == 422
    assert client.post("/api/activo", json={"nombre": "", "valor_inicial": 1}).status_code == 422


def test_editar_con_mismo_valor_conserva_valor_actualizado_en(client):
    a = _crear(client, valor_actual=4000, fecha_adquisicion="2026-01-02")
    r = client.put(f"/api/activo/{a['id']}", json={"nombre": "Moto2", "valor_inicial": 5000, "valor_actual": 4000})
    assert _actualizado_en(client, a["id"]) == "2026-01-02"
    assert r.json()["fecha_adquisicion"] == "2026-01-02"


def test_editar_con_valor_distinto_sella_ahora(client):
    a = _crear(client, valor_actual=4000, fecha_adquisicion="2026-01-02")
    client.put(f"/api/activo/{a['id']}", json={"nombre": "Moto", "valor_inicial": 5000, "valor_actual": 4500})
    actualizado = _actualizado_en(client, a["id"])
    assert actualizado.startswith(HOY_ISO)
    assert "T" in actualizado


def test_editar_con_fecha_explicita_la_respeta(client):
    a = _crear(client)
    body = {"nombre": "Moto", "valor_inicial": 5000, "valor_actual": 6000, "valor_actualizado_en": "2026-03-04T09:00"}
    client.put(f"/api/activo/{a['id']}", json=body)
    assert _actualizado_en(client, a["id"]) == "2026-03-04T09:00"


def test_venta_sin_fecha_usa_ahora_y_borra_activo(client):
    a = _crear(client)
    assert client.post(f"/api/activo/{a['id']}/venta", json={"precio": 4200}).status_code == 200
    assert client.get("/api/backup").json()["activos"] == []
    tx = client.get("/api/backup").json()["transacciones"][0]
    assert tx["fecha"].startswith(HOY_ISO) and "T" in tx["fecha"]
    assert client.post(f"/api/activo/{a['id']}/venta", json={"precio": 1}).status_code == 404


def test_venta_precio_invalido_422(client):
    a = _crear(client)
    assert client.post(f"/api/activo/{a['id']}/venta", json={"precio": 0}).status_code == 422


def test_resumen_trae_frases(client):
    assert client.get("/api/activos/resumen").json()["texto_conteo"] == "0 activos"
    assert client.get("/api/activos/resumen").json()["texto_variacion"] == ""
    _crear(client, valor_actual=7500)
    r = client.get("/api/activos/resumen").json()
    assert (r["texto_conteo"], r["texto_variacion"]) == ("1 activo", "50,0% sobre lo pagado")
    _crear(client, nombre="Otra")
    assert client.get("/api/activos/resumen").json()["texto_conteo"] == "2 activos"


def test_actualizar_valor_sella_ahora_o_usa_la_fecha(client):
    a = _crear(client, fecha_adquisicion="2026-01-02")
    r = client.post(f"/api/activo/{a['id']}/valor", json={"nuevo_valor": 6000})
    assert r.json()["valor_actual"] == 6000
    actualizado = _actualizado_en(client, a["id"])
    assert actualizado.startswith(HOY_ISO) and "T" in actualizado
    r = client.post(f"/api/activo/{a['id']}/valor", json={"nuevo_valor": 6500, "fecha": "2026-03-04T09:00"})
    assert (r.json()["valor_actual"], _actualizado_en(client, a["id"])) == (6500, "2026-03-04T09:00")


def test_actualizar_valor_invalido_o_inexistente(client):
    a = _crear(client)
    assert client.post(f"/api/activo/{a['id']}/valor", json={"nuevo_valor": 0}).status_code == 422
    assert client.post("/api/activo/999/valor", json={"nuevo_valor": 5}).status_code == 404


def test_valor_redondea_a_pesos_y_compra_usa_texto_de_dominio(client):
    a = _crear(client, crear_tx=True)
    r = client.post(f"/api/activo/{a['id']}/valor", json={"nuevo_valor": 4999.5}).json()
    assert r["valor_actual"] == 5000
    tx = client.get("/api/backup").json()["transacciones"][0]
    assert tx["descripcion"] == "Compra · Moto"


def test_montos_de_activo_se_redondean_a_pesos(client):
    a = client.post("/api/activo", json={"nombre": "Moto", "valor_inicial": 100.5, "valor_actual": 200.5}).json()
    assert (a["valor_inicial"], a["valor_actual"]) == (101, 201)
    assert client.post("/api/activo", json={"nombre": "x", "valor_inicial": 0.4}).status_code == 422


def test_venta_borra_el_activo_y_registra_ingreso(client):
    a = client.post(
        "/api/activo", json={"nombre": "Moto", "valor_inicial": 5000, "valor_actual": 4000}
    ).json()
    client.post(f"/api/activo/{a['id']}/venta", json={"precio": 4200, "fecha": "2026-07-01"})
    assert client.get("/api/backup").json()["activos"] == []
    tx = client.get("/api/backup").json()["transacciones"][0]
    assert (tx["tipo"], tx["monto"], tx["categoria"]) == ("ingreso", 4200, "Venta activos")


def test_un_activo_que_vale_cero_se_puede_guardar(client):
    a = client.post("/api/activo", json={"nombre": "Moto", "valor_inicial": 5000, "valor_actual": 0}).json()
    assert a["valor_actual"] == 0
    editado = client.put(f"/api/activo/{a['id']}", json={"nombre": "Moto", "valor_inicial": 5000, "valor_actual": 0}).json()
    assert editado["valor_actual"] == 0
    omitido = client.post("/api/activo", json={"nombre": "Otra", "valor_inicial": 700}).json()
    assert omitido["valor_actual"] == 700
