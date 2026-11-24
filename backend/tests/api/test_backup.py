TX_OK = {"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 100}
INV_OK = {"nombre": "CDT", "tipo": "fija", "monto_invertido": 1000, "tasa_ea": 10, "fecha_inicio": "2026-01-01"}


def test_roundtrip_export_import(client, tarjeta):
    client.post("/api/tx", json={**TX_OK, "tarjeta_id": tarjeta["id"]})
    client.post("/api/rec", json={"nombre": "Netflix", "tipo": "gasto", "monto": 40, "frecuencia": "mensual"})
    client.post("/api/inv", json=INV_OK)
    client.post("/api/activo", json={"nombre": "Casa", "valor_inicial": 1000, "valor_actual": 1200})
    client.post("/api/categorias", json={"tipo": "gasto", "nombre": "Extra"})
    client.post("/api/ops-ocultas", json={"clave": "deuda:1:2026-01-01"})
    client.put("/api/ajustes", json={"moneda_simbolo": "US$"})
    antes = client.get("/api/backup").json()
    assert antes["ajustes"] == [{"clave": "moneda_simbolo", "valor": "US$"}]
    assert set(antes) == {"transacciones", "deudas", "inversiones", "activos", "recurrentes", "categorias", "ops_ocultas", "ajustes"}
    assert all(len(filas) == 1 for tabla, filas in antes.items() if tabla not in ("deudas", "ajustes"))

    client.post("/api/truncate")
    client.put("/api/ajustes", json={"moneda_simbolo": "$"})
    vacio = client.get("/api/backup").json()
    assert all(filas == [] for tabla, filas in vacio.items() if tabla != "ajustes")

    r = client.post("/api/import", json=antes).json()
    assert r["counts"]["transacciones"] == 1 and r["counts"]["categorias"] == 1
    assert r["texto"].startswith("Importado: 1 deuda, 1 inversión, 1 activo")
    assert "1 operación oculta" in r["texto"]
    assert client.get("/api/backup").json() == antes


def test_import_rechaza_filas_corruptas(client):
    r = client.post("/api/import", json={"transacciones": [{**TX_OK, "monto": "mucha plata"}]})
    assert r.status_code == 400
    assert "transacciones[0]" in r.json()["detail"]
    assert "Debe ser un número" in r.json()["detail"]


def test_import_viejo_sin_categorias_ni_ops_entra(client):
    assert client.post("/api/import", json={"transacciones": [TX_OK]}).status_code == 200


def test_import_corrupto_no_deja_nada_a_medias(client):
    payload = {"transacciones": [TX_OK, {**TX_OK, "tipo": "banana"}]}
    assert client.post("/api/import", json=payload).status_code == 400
    assert client.get("/api/backup").json()["transacciones"] == []


def test_import_inversion_sin_valor_actual_usa_el_monto_invertido(client):
    fila = {"nombre": "Fondo", "tipo": "variable", "monto_invertido": 500}
    assert client.post("/api/import", json={"inversiones": [fila]}).json()["counts"]["inversiones"] == 1
    guardada = client.get("/api/backup").json()["inversiones"][0]
    assert guardada["valor_actual"] == 500
    assert guardada["fecha_inicio"] and guardada["valor_actualizado_en"] == guardada["fecha_inicio"]


def test_import_ids_duplicados_se_reporta_como_tal(client):
    fila = {**TX_OK, "id": 1}
    r = client.post("/api/import", json={"transacciones": [fila, fila]})
    assert r.status_code == 400
    assert "ids duplicados" in r.json()["detail"]


def test_truncate_reinicia_ids_y_vacia_categorias_y_ops_pero_no_ajustes(client):
    client.post("/api/tx", json=TX_OK)
    client.post("/api/categorias", json={"tipo": "gasto", "nombre": "Extra"})
    client.post("/api/ops-ocultas", json={"clave": "deuda:1:2026-01-01"})
    client.put("/api/ajustes", json={"moneda_simbolo": "US$"})
    assert client.post("/api/truncate").status_code == 200
    assert client.get("/api/bootstrap").json()["categorias"]["gasto"] == [
        {"nombre": "Inversión", "sistema": True},
        {"nombre": "Compra activos", "sistema": True},
    ]
    assert client.get("/api/ops-ocultas").json() == {"items": []}
    assert client.get("/api/bootstrap").json()["ajustes"] == {"moneda_simbolo": "US$"}
    assert client.post("/api/tx", json=TX_OK).json()["id"] == 1


def test_lectura_no_necesita_header_csrf(client):
    client.headers.pop("x-moni-request")
    assert client.get("/api/backup").status_code == 200


def test_import_restaura_ajustes_y_rechaza_simbolo_invalido(client):
    assert client.post("/api/import", json={"ajustes": [{"clave": "moneda_simbolo", "valor": "EUR"}]}).status_code == 200
    assert client.get("/api/bootstrap").json()["ajustes"] == {"moneda_simbolo": "EUR"}
    r = client.post("/api/import", json={"ajustes": [{"clave": "moneda_simbolo", "valor": "demasiado"}]})
    assert r.status_code == 400 and r.json()["detail"].startswith("Fila ajustes[0] inválida")
    assert client.post("/api/import", json={"ajustes": [{"clave": "otra", "valor": "x"}]}).status_code == 400


def test_import_op_oculta_invalida_es_error_de_dominio_en_espanol(client):
    r = client.post("/api/import", json={"ops_ocultas": [{"clave": "x:1:2026-01-01"}]})
    assert r.status_code == 400 and r.json()["detail"].startswith("Fila ops_ocultas[0] inválida")
