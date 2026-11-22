import re

from .builders import tx


def _tarjeta(client, nombre="Visa Oro"):
    return client.post(
        "/api/deuda", json={"nombre": nombre, "monto_inicial": 0, "saldo_actual": 0, "es_tarjeta": True}
    ).json()


def test_opciones_de_movimiento_nuevo(client):
    t = _tarjeta(client)
    client.post("/api/deuda", json={"nombre": "Credito", "monto_inicial": 10, "saldo_actual": 10})
    client.post("/api/categorias", json={"tipo": "gasto", "nombre": "Mascotas"})
    o = client.get("/api/tx/opciones").json()
    assert o["tarjetas"] == [{"id": t["id"], "nombre": "Visa Oro"}]
    assert o["categorias"]["gasto"][-1] == "Mascotas"
    assert o["categoria_default"] == {"ingreso": o["categorias"]["ingreso"][0], "gasto": o["categorias"]["gasto"][0]}
    assert o["inicial"]["tipo"] == "gasto"
    assert o["inicial"]["categoria"] == o["categoria_default"]["gasto"]
    assert o["inicial"]["tarjeta_id"] is None
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", o["inicial"]["fecha"])


def test_opciones_de_edicion_conservan_categoria_vieja_y_tarjeta(client):
    t = _tarjeta(client)
    fila = tx(client, categoria="Categoría vieja", tarjeta_id=t["id"], fecha="2026-03-10")
    o = client.get("/api/tx/opciones", params={"tx_id": fila["id"]}).json()
    assert o["categorias"]["gasto"][-1] == "Categoría vieja"
    assert "Categoría vieja" not in o["categorias"]["ingreso"]
    assert o["inicial"] == {"tipo": "gasto", "categoria": "Categoría vieja", "tarjeta_id": t["id"], "fecha": "2026-03-10T00:00"}


def test_opciones_ingreso_y_tarjeta_borrada(client):
    t = _tarjeta(client)
    fila = tx(client, tarjeta_id=t["id"])
    client.delete(f"/api/deuda/{t['id']}")
    assert client.get("/api/tx/opciones", params={"tx_id": fila["id"]}).json()["inicial"]["tarjeta_id"] is None
    ing = tx(client, tipo="ingreso", categoria="Salario")
    o = client.get("/api/tx/opciones", params={"tx_id": ing["id"]}).json()
    assert o["inicial"]["tipo"] == "ingreso" and "Salario" in o["categorias"]["ingreso"]


def test_opciones_tx_inexistente(client):
    assert client.get("/api/tx/opciones", params={"tx_id": 999}).status_code == 404


def test_fecha_omitida_toma_ahora_de_bogota(client):
    r = client.post("/api/tx", json={"tipo": "gasto", "categoria": "Comida", "monto": 10})
    assert r.status_code == 200
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", r.json()["fecha"])


def test_listado_trae_etiquetas_de_tipo(client):
    tx(client, tipo="ingreso", categoria="Salario")
    tx(client)
    body = client.get("/api/tx").json()
    assert {i["tipo_label"] for i in body["items"]} == {"Ingreso", "Gasto"}
    assert body["opciones"]["tipos"] == [{"value": "ingreso", "label": "Ingresos"}, {"value": "gasto", "label": "Gastos"}]


def test_columna_invalida_422(client):
    assert client.get("/api/tx", params={"col": "nada"}).status_code == 422
