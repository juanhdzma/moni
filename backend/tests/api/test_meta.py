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


def test_meta_defaults_y_push(client):
    body = client.get("/api/meta").json()
    assert body["defaults"] == {
        "frecuencia_recurrente": "mensual",
        "tipo_inversion": "fija",
        "pago_inversion": "vencimiento",
        "tipo_tasa": "ea",
        "clase_deuda": "prestamo",
        "franquicia": "Visa",
    }
    assert body["push"] == {
        "hora": "8:00",
        "frase": "Aviso diario a las 8:00 de las cuotas, rendimientos y recurrentes que vencen hoy o mañana.",
    }
    assert body["categoria_largo_max"] == 25


def test_meta_defaults_existen_en_sus_listas(client):
    body = client.get("/api/meta").json()
    d = body["defaults"]
    assert d["tipo_inversion"] in [o["value"] for o in body["tipos_inversion"]]
    assert d["pago_inversion"] in [o["value"] for o in body["pagos_inversion"]]
    assert d["tipo_tasa"] in [o["value"] for o in body["tipos_tasa"]]
    assert d["clase_deuda"] in [o["value"] for o in body["clases_deuda"]]
    assert d["franquicia"] in [o["value"] for o in body["franquicias"]]
    assert d["frecuencia_recurrente"] in [o["value"] for o in body["frecuencias"]]


def test_meta_tonos_y_tipos_tasa(client):
    body = client.get("/api/meta").json()
    tonos = lambda k: {o["value"]: o.get("tono") for o in body[k]}
    assert tonos("tipos_inversion") == {"fija": "ingreso", "variable": "gasto"}
    assert tonos("pagos_inversion") == {"mensual": "ingreso", "vencimiento": None}
    assert tonos("tipos_retiro") == {"total": "ingreso", "parcial": None}
    assert tonos("destinos_rendimiento") == {"cuenta": "ingreso", "capitaliza": None}
    assert body["tipos_tasa"] == [{"value": "ea", "label": "EA"}, {"value": "mv", "label": "MV"}]
