def test_meta_listas_de_dominio(client):
    r = client.get("/api/meta")
    assert r.status_code == 200
    body = r.json()
    assert {"value": "mensual", "label": "Mensual"} in body["frecuencias"]
    assert {"value": "", "label": "Ninguna"} in body["franquicias"]
    assert "tipos_transaccion" not in body
    assert [t["value"] for t in body["tipos_inversion"]] == ["fija", "variable"]
    assert [t["value"] for t in body["pagos_inversion"]] == ["mensual", "vencimiento"]
    assert [p["label"] for p in body["periodos"]["gastos"]] == ["1S", "1M", "3M", "6M", "1A", "Todo"]
    assert [p["value"] for p in body["periodos"]["evolucion"]] == ["3M", "6M", "1Y", "ALL"]
    assert [t["value"] for t in body["tipos_manuales"]] == ["ingreso", "gasto"]
    assert [t["label"] for t in body["tipos_categoria"]] == ["Ingresos", "Gastos", "Transferencias"]
    assert [c["value"] for c in body["clases_deuda"]] == ["prestamo", "tarjeta"]
    assert [t["value"] for t in body["tipos_retiro"]] == ["total", "parcial"]
    assert [d["value"] for d in body["destinos_rendimiento"]] == ["cuenta", "capitaliza"]
    assert all(d["hint"] for d in body["destinos_rendimiento"])
    assert body["monedas"][0] == {"value": "$", "label": "Peso colombiano ($)"} and len(body["monedas"]) == 5
    assert [s["value"] for s in body["series_evolucion"]] == ["patrimonio", "inversiones"]
    assert body["columnas_transaccion"] == [
        {"col": "fecha", "label": "Fecha", "dir_defecto": -1},
        {"col": "tipo", "label": "Tipo", "dir_defecto": 1},
        {"col": "categoria", "label": "Categoría", "dir_defecto": 1},
        {"col": "descripcion", "label": "Descripción", "dir_defecto": 1},
        {"col": "monto", "label": "Monto", "dir_defecto": -1},
    ]


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
