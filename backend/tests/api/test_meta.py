def test_meta_listas_de_dominio(client):
    r = client.get("/api/meta")
    assert r.status_code == 200
    body = r.json()
    assert {"value": "mensual", "label": "Mensual"} in body["frecuencias"]
    assert {"value": "", "label": "Ninguna"} in body["franquicias"]
    assert [t["value"] for t in body["tipos_transaccion"]] == ["ingreso", "gasto", "transfer"]
    assert [t["value"] for t in body["tipos_inversion"]] == ["fija", "variable"]
    assert [t["value"] for t in body["pagos_inversion"]] == ["mensual", "vencimiento"]
    assert body["periodos"] == client.get("/api/dashboard/periodos").json()


def test_meta_requiere_sesion(anon_client):
    assert anon_client.get("/api/meta").status_code == 401


def _errores(client, payload):
    r = client.post("/api/tx", json=payload)
    assert r.status_code == 422
    return {tuple(e["loc"])[-1]: e for e in r.json()["detail"]}


def test_422_formato_y_mensajes(client):
    errores = _errores(client, {"tipo": "otro", "monto": 0, "fecha": "ayer"})
    assert set(errores["monto"]) == {"loc", "msg", "type"}
    assert errores["monto"]["msg"] == "Debe ser mayor que 0"
    assert errores["tipo"]["msg"] == "Opción inválida"
    assert errores["fecha"]["msg"].startswith("fecha debe ser")


def test_422_valor_requerido(client):
    errores = _errores(client, {})
    assert errores["tipo"]["msg"] == "Este valor es requerido"
