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
    assert [t["tono"] for t in body["tipos_categoria"]] == ["ingreso", "gasto", "transfer"]
    assert [c["value"] for c in body["clases_deuda"]] == ["prestamo", "tarjeta"]
    assert [t["value"] for t in body["tipos_retiro"]] == ["total", "parcial"]
    assert [d["value"] for d in body["destinos_rendimiento"]] == ["cuenta", "capitaliza"]
    assert all(d["hint"] for d in body["destinos_rendimiento"])
    assert body["monedas"][0] == {"value": "$", "label": "Peso colombiano ($)"} and len(body["monedas"]) == 5
    assert [s["value"] for s in body["series_evolucion"]] == ["patrimonio", "inversiones"]
    assert body["columnas_transaccion"] == [
        {"col": "fecha", "label": "Fecha", "dir_defecto": -1, "ordenable": True, "oculta_en_movil": False},
        {"col": "tipo", "label": "Tipo", "dir_defecto": 1, "ordenable": True, "oculta_en_movil": True},
        {"col": "categoria", "label": "Categoría", "dir_defecto": 1, "ordenable": True, "oculta_en_movil": True},
        {"col": "descripcion", "label": "Descripción", "dir_defecto": 1, "ordenable": True, "oculta_en_movil": False},
        {"col": "monto", "label": "Monto", "dir_defecto": -1, "ordenable": True, "oculta_en_movil": False},
        {"col": "metodo_pago", "label": "Método de pago", "dir_defecto": 1, "ordenable": False, "oculta_en_movil": False},
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
        "tipo_retiro": "total",
        "periodo_gastos": "1M",
        "periodo_evolucion": "6M",
        "serie_evolucion": "patrimonio",
        "orden_tx": {"col": "fecha", "dir": -1},
        "etiqueta_efectivo": "Efectivo / Débito",
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


def test_meta_defaults_de_ui_existen_en_sus_listas(client):
    body = client.get("/api/meta").json()
    d = body["defaults"]
    assert d["tipo_retiro"] in [o["value"] for o in body["tipos_retiro"]]
    assert d["periodo_gastos"] in [o["value"] for o in body["periodos"]["gastos"]]
    assert d["periodo_evolucion"] in [o["value"] for o in body["periodos"]["evolucion"]]
    assert d["serie_evolucion"] in [o["value"] for o in body["series_evolucion"]]
    assert d["orden_tx"]["col"] in [c["col"] for c in body["columnas_transaccion"] if c["ordenable"]]


def test_meta_campos_por_tipo_y_pago(client):
    body = client.get("/api/meta").json()
    assert {t["value"]: t["campos"] for t in body["tipos_inversion"]} == {"fija": ["tasa", "pago"], "variable": []}
    assert {p["value"]: p["requiere_dia"] for p in body["pagos_inversion"]} == {"mensual": True, "vencimiento": False}
    assert {c["value"]: c["es_tarjeta"] for c in body["clases_deuda"]} == {"prestamo": False, "tarjeta": True}


def test_meta_modos_de_pago(client):
    modos = client.get("/api/meta").json()["modos_pago"]
    assert modos == [
        {"value": "cuota", "label": "Pagar cuota", "placeholder_notas": "Ej. Cuota #14"},
        {"value": "abono", "label": "Abonar", "placeholder_notas": "Ej. Abono extraordinario"},
        {"value": "liquidar", "label": "Liquidar", "placeholder_notas": "Liquidar la deuda"},
    ]


def test_meta_series_con_tono_limites_y_truncate(client):
    body = client.get("/api/meta").json()
    assert {s["value"]: s["tono"] for s in body["series_evolucion"]} == {"patrimonio": "cartera", "inversiones": "inversiones"}
    assert body["limites"] == {"nombre": 40, "descripcion": 120, "notas": 200, "dia_pago_max": 31}
    assert body["truncate"]["palabra"] == "BORRAR"
    assert set(body["truncate"]["entidades"]) == {
        "deudas", "inversiones", "activos", "recurrentes", "transacciones", "categorías", "operaciones ocultas",
    }
    assert body["truncate"]["texto"].startswith("Esto borra permanentemente todas las deudas, inversiones")
    assert body["truncate"]["texto"].endswith("Se conservan los ajustes y las suscripciones push.")


def test_meta_franquicias_y_tipos_manuales_salen_de_constantes(client):
    body = client.get("/api/meta").json()
    assert [f["value"] for f in body["franquicias"]] == ["Visa", "Mastercard", "Amex", "Otra", ""]
    assert body["tipos_manuales"] == [{"value": "ingreso", "label": "Ingreso"}, {"value": "gasto", "label": "Gasto"}]


def test_meta_entidades_salen_de_core_afectadas(client):
    from backend.core.afectadas import DEL_BOOTSTRAP, TODAS

    body = client.get("/api/meta").json()
    assert body["entidades"] == list(TODAS)
    assert body["entidades_del_bootstrap"] == ["activos", "inversiones", "ajustes", "categorias"] == list(DEL_BOOTSTRAP)
    assert set(DEL_BOOTSTRAP) <= set(TODAS)
