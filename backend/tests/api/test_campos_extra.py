import pytest

from .builders_api import tx
from .test_backup import importar

CUERPOS = [
    ("post", "/api/tx", {"tipo": "gasto", "categoria": "Comida", "monto": 10}),
    ("post", "/api/deuda", {"nombre": "D", "saldo_actual": 10}),
    ("post", "/api/inv", {"nombre": "I", "tipo": "variable", "monto_invertido": 10}),
    ("post", "/api/rec", {"nombre": "R", "tipo": "gasto", "monto": 10, "frecuencia": "mensual"}),
    ("post", "/api/activo", {"nombre": "A", "valor_inicial": 10}),
    ("post", "/api/categorias", {"tipo": "gasto", "nombre": "Viajes"}),
]


@pytest.mark.parametrize("metodo,url,cuerpo", CUERPOS)
def test_un_campo_desconocido_da_422_en_espanol(client, metodo, url, cuerpo):
    ok = getattr(client, metodo)(url, json=cuerpo)
    assert ok.status_code in (200, 201), ok.text
    r = getattr(client, metodo)(url, json={**cuerpo, "monto_firmado": 1})
    assert r.status_code == 422
    assert [e["msg"] for e in r.json()["detail"]] == ["Campo no permitido"]


def test_put_de_tx_rechaza_la_fila_con_derivados(client):
    fila = tx(client)
    assert client.put(f"/api/tx/{fila['id']}", json=fila).status_code == 422


def test_import_acepta_filas_con_columnas_derivadas(client):
    fila = {**client.get(f"/api/tx/{tx(client)['id']}").json(), "id": 99}
    creada = client.post("/api/deuda", json={"nombre": "D", "saldo_actual": 10}).json()
    deuda = {**client.get(f"/api/deuda/{creada['id']}").json(), "id": 98}
    assert "monto_firmado" in fila and "pago" in deuda
    r = importar(client, {"transacciones": [fila], "deudas": [deuda]})
    assert r.status_code == 200, r.text


@pytest.mark.parametrize("metodo,ruta", [("put", "/api/tx/abc"), ("post", "/api/deuda/abc/pago"), ("post", "/api/rec/abc/pausar")])
def test_los_ids_no_numericos_no_matchean_la_ruta(client, metodo, ruta):
    assert getattr(client, metodo)(ruta, json={}).status_code in (404, 405)
