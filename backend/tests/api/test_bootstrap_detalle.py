import datetime

import pytest

from backend.calculos.constantes import DIAS_DESACTUALIZADO, TEXTO_DESACTUALIZADO

from .builders_api import DEUDA_DERIVADOS, HOY, INV_DERIVADOS, REC_DERIVADOS, TX_DERIVADOS, sembrar


def test_bootstrap_lleva_contexto_de_la_sesion(client):
    sembrar(client)
    body = client.get("/api/bootstrap").json()
    assert body["hoy"] == HOY.isoformat()
    assert body["ajustes"] == {"moneda_simbolo": "$"}
    assert body["alertas"] == {"activos": False, "inversiones": True}
    assert "conteos" not in body
    assert body["categorias"]["ingreso"][0] == {"nombre": "Crédito recibido", "sistema": True}


def test_bootstrap_sin_filas_y_con_umbral(client):
    sembrar(client)
    datos = client.get("/api/bootstrap").json()
    assert set(datos) == {"hoy", "ahora", "categorias", "ajustes", "alertas", "desactualizado"}
    assert datos["hoy"] == HOY.isoformat()
    assert datos["ahora"].startswith(datos["hoy"]) and len(datos["ahora"]) == 16
    assert datos["desactualizado"] == {"texto": TEXTO_DESACTUALIZADO}
    assert datos["ajustes"] == {"moneda_simbolo": "$"}


def test_bootstrap_alerta_de_activo_desactualizado(client):
    viejo = (HOY - datetime.timedelta(days=DIAS_DESACTUALIZADO + 1)).isoformat()
    client.post("/api/activo", json={"nombre": "Casa", "valor_inicial": 10, "valor_actualizado_en": viejo})
    assert client.get("/api/bootstrap").json()["alertas"]["activos"] is True


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


@pytest.mark.parametrize("ruta", ["tx", "deuda", "inv", "rec"])
def test_detalle_inexistente_es_404(client, ruta):
    assert client.get(f"/api/{ruta}/9999").status_code == 404


def test_detalle_no_pisa_rutas_fijas(client):
    assert client.get("/api/inv/resumen").status_code == 200
    assert client.get("/api/rec/resumen").status_code == 200
    assert client.get("/api/tx/opciones").status_code == 200


def test_detalle_tx_trae_la_tarjeta(client):
    tarjeta = client.post("/api/deuda", json={"nombre": "Visa", "es_tarjeta": True, "cupo": 1000, "franquicia": "Visa"}).json()
    tx = client.post("/api/tx", json={"tipo": "gasto", "categoria": "Comida", "monto": 5, "tarjeta_id": tarjeta["id"]}).json()
    assert client.get(f"/api/tx/{tx['id']}").json()["tarjeta_nombre"] == "Visa"


def test_inversion_expone_capitaliza_default(client):
    inv = client.post("/api/inv", json={"nombre": "CDT", "tipo": "fija", "monto_invertido": 100, "pago": "vencimiento"}).json()
    assert client.get(f"/api/inv/{inv['id']}").json()["capitaliza_default"] is True
    assert client.get(f"/api/inv/{inv['id']}/rendimiento/defaults").status_code == 404


def test_credito_saldado_se_puede_editar_pero_no_crear_sin_saldo(client):
    deuda = client.post("/api/deuda", json={"nombre": "X", "monto_inicial": 100, "saldo_actual": 100}).json()
    editada = client.put(f"/api/deuda/{deuda['id']}", json={"nombre": "X2", "monto_inicial": 100, "saldo_actual": 0})
    assert editada.status_code == 200 and editada.json()["saldo_actual"] == 0
    assert client.post("/api/deuda", json={"nombre": "Y", "monto_inicial": 100}).status_code == 422


def test_proximas_usa_el_simbolo_de_moneda(client):
    client.put("/api/ajustes", json={"moneda_simbolo": "US$"})
    client.post("/api/deuda", json={
        "nombre": "C", "saldo_actual": 500, "cuota_mensual": 100, "proxima_cuota": (HOY + datetime.timedelta(days=2)).isoformat(),
    })
    assert "US$" in client.get("/api/proximas-operaciones").json()["frase"]["texto"]


def test_get_activo_por_id_ya_no_existe(client):
    sembrar(client)
    activo_id = client.get("/api/backup").json()["activos"][0]["id"]
    assert client.get(f"/api/activo/{activo_id}").status_code in (404, 405)
