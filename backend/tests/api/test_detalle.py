from .builders_api import DEUDA_DERIVADOS, HOY, INV_DERIVADOS, REC_DERIVADOS, TX_DERIVADOS, sembrar


def _crear_uno_de_cada(client):
    sembrar(client)
    ids = {}
    for ruta, nombre in (("tx", "transacciones"), ("deuda", "deudas"), ("inv", "inversiones"), ("rec", "recurrentes")):
        ids[ruta] = [r["id"] for r in client.get("/api/backup").json()[nombre]]
    return ids


def test_detalle_devuelve_la_fila_con_derivados(client):
    client.post("/api/rec", json={"nombre": "Netflix", "tipo": "gasto", "monto": 10, "frecuencia": "mensual", "fecha_inicio": HOY.isoformat()})
    ids = _crear_uno_de_cada(client)
    esperados = {"tx": TX_DERIVADOS, "deuda": DEUDA_DERIVADOS, "inv": INV_DERIVADOS, "rec": REC_DERIVADOS}
    for ruta, derivados in esperados.items():
        fila = client.get(f"/api/{ruta}/{ids[ruta][0]}").json()
        assert derivados <= set(fila), ruta
        assert fila["id"] == ids[ruta][0]


def test_detalle_no_pisa_rutas_fijas(client):
    assert client.get("/api/inv/resumen").status_code == 200
    assert client.get("/api/rec/resumen").status_code == 200
    assert client.get("/api/tx/opciones").status_code == 200


def test_detalle_tx_trae_la_tarjeta(client):
    tarjeta = client.post("/api/deuda", json={"nombre": "Visa", "clase_deuda": "tarjeta", "cupo": 1000, "franquicia": "Visa"}).json()
    tx = client.post("/api/tx", json={"tipo": "gasto", "categoria": "Comida", "monto": 5, "tarjeta_id": tarjeta["id"]}).json()
    assert client.get(f"/api/tx/{tx['id']}").json()["tarjeta_nombre"] == "Visa"


def test_detalle_activo_trae_derivados_y_404(client):
    from .builders_api import ACTIVO_DERIVADOS

    a = client.post("/api/activo", json={"nombre": "Moto", "valor_inicial": 1000, "valor_actual": 1500}).json()
    fila = client.get(f"/api/activo/{a['id']}").json()
    assert ACTIVO_DERIVADOS <= set(fila) and fila["id"] == a["id"]
    assert client.get("/api/activo/999").status_code == 404


def test_rutas_de_id_solo_aceptan_enteros(client):
    assert client.delete("/api/deuda/abc").status_code in (404, 405)
    assert client.put("/api/deuda/abc", json={"nombre": "x"}).status_code in (404, 405)
    assert client.put("/api/activo/abc", json={"nombre": "x", "valor_inicial": 1}).status_code in (404, 405)
