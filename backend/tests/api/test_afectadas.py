import pytest

from backend.core.afectadas import HEADER_AFECTADAS, TODAS
from backend.main import app
from .builders_api import HOY_ISO

TX = {"fecha": HOY_ISO, "tipo": "gasto", "categoria": "Comida", "descripcion": "x", "monto": 1000}
INV = {"nombre": "CDT", "tipo": "fija", "monto_invertido": 1_000_000, "valor_actual": 1_000_000,
       "tasa_ea": 12, "pago": "mensual", "dia_pago": 15}
ACTIVO = {"nombre": "Casa", "valor_inicial": 100, "valor_actual": 100}
REC = {"nombre": "Arriendo", "tipo": "gasto", "monto": 800_000, "frecuencia": "mensual", "fecha_inicio": "2026-01-05"}
PAGO = {"modo": "abono", "nuevo_saldo": 900_000, "total_pagado": 100_000, "fecha": "2026-07-01", "descripcion": "x"}
CLAVE = "recurrente:1:2026-07-01"


def afectadas(r):
    assert r.status_code < 400, r.text
    return r.headers[HEADER_AFECTADAS].split(",")


@pytest.fixture
def inv(client):
    return client.post("/api/inv", json=INV).json()


@pytest.fixture
def activo(client):
    return client.post("/api/activo", json=ACTIVO).json()


def test_tx_sin_tarjeta_solo_transacciones(client):
    assert afectadas(client.post("/api/tx", json=TX)) == ["transacciones"]


def test_tx_con_tarjeta_toca_deudas(client, tarjeta):
    assert afectadas(client.post("/api/tx", json={**TX, "tarjeta_id": tarjeta["id"]})) == ["transacciones", "deudas"]


def test_tx_con_op_clave_toca_ops_ocultas(client):
    assert afectadas(client.post("/api/tx", json={**TX, "op_clave": CLAVE})) == ["transacciones", "opsOcultas"]


def test_update_tx_mira_tarjeta_previa_y_nueva(client, tarjeta):
    sin = client.post("/api/tx", json=TX).json()["id"]
    con = client.post("/api/tx", json={**TX, "tarjeta_id": tarjeta["id"]}).json()["id"]
    assert afectadas(client.put(f"/api/tx/{sin}", json=TX)) == ["transacciones"]
    assert afectadas(client.put(f"/api/tx/{sin}", json={**TX, "tarjeta_id": tarjeta["id"]})) == ["transacciones", "deudas"]
    assert afectadas(client.put(f"/api/tx/{con}", json=TX)) == ["transacciones", "deudas"]


def test_delete_tx_depende_de_la_tarjeta(client, tarjeta):
    sin = client.post("/api/tx", json=TX).json()["id"]
    con = client.post("/api/tx", json={**TX, "tarjeta_id": tarjeta["id"]}).json()["id"]
    assert afectadas(client.delete(f"/api/tx/{sin}")) == ["transacciones"]
    assert afectadas(client.delete(f"/api/tx/{con}")) == ["transacciones", "deudas"]


@pytest.mark.parametrize("registrar,esperado", [(True, ["deudas", "transacciones"]), (False, ["deudas"])])
def test_pago_segun_registrar_tx(client, prestamo, registrar, esperado):
    r = client.post(f"/api/deuda/{prestamo['id']}/pago", json={**PAGO, "registrar_tx": registrar})
    assert afectadas(r) == esperado


def test_pago_con_op_clave_agrega_ops_ocultas(client, prestamo):
    clave = f"deuda:{prestamo['id']}:2026-07-01"
    r = client.post(f"/api/deuda/{prestamo['id']}/pago", json={**PAGO, "registrar_tx": False, "op_clave": clave})
    assert afectadas(r) == ["deudas", "opsOcultas"]


@pytest.mark.parametrize("registrar,esperado", [(True, ["deudas", "transacciones"]), (False, ["deudas"])])
def test_adelanto_segun_registrar_tx(client, tarjeta, registrar, esperado):
    r = client.post(f"/api/deuda/{tarjeta['id']}/adelanto", json={"monto": 100_000, "nuevo_saldo": 100_000, "registrar_tx": registrar})
    assert afectadas(r) == esperado


@pytest.mark.parametrize("registrar,esperado", [(True, ["inversiones", "transacciones"]), (False, ["inversiones"])])
def test_aporte_segun_registrar_tx(client, inv, registrar, esperado):
    r = client.post(f"/api/inv/{inv['id']}/aporte", json={"monto": 1000, "fecha": HOY_ISO, "registrar_tx": registrar})
    assert afectadas(r) == esperado


@pytest.mark.parametrize("capitaliza,registrar,esperado", [
    (False, True, ["inversiones", "transacciones"]),
    (False, False, ["inversiones"]),
    (True, True, ["inversiones"]),
])
def test_rendimiento(client, inv, capitaliza, registrar, esperado):
    r = client.post(f"/api/inv/{inv['id']}/rendimiento",
                    json={"monto": 1000, "fecha": HOY_ISO, "capitaliza": capitaliza, "registrar_tx": registrar})
    assert afectadas(r) == esperado


def test_rendimiento_con_op_clave(client, inv):
    clave = f"inversion:{inv['id']}:{HOY_ISO}"
    r = client.post(f"/api/inv/{inv['id']}/rendimiento", json={"monto": 1000, "fecha": HOY_ISO, "op_clave": clave})
    assert afectadas(r) == ["inversiones", "transacciones", "opsOcultas"]


def test_retiro_y_valor_de_inversion(client, inv):
    r = client.post(f"/api/inv/{inv['id']}/retiro", json={"tipo": "parcial", "monto": 1000, "saldo_queda": 500, "fecha": HOY_ISO})
    assert afectadas(r) == ["inversiones", "transacciones"]
    assert afectadas(client.post(f"/api/inv/{inv['id']}/valor", json={"nuevo_valor": 5})) == ["inversiones"]


def test_activo_valor_y_venta(client, activo):
    assert afectadas(client.post(f"/api/activo/{activo['id']}/valor", json={"nuevo_valor": 5})) == ["activos"]
    r = client.post(f"/api/activo/{activo['id']}/venta", json={"precio": 50, "registrar_tx": False})
    assert afectadas(r) == ["activos"]


def test_venta_con_tx(client, activo):
    assert afectadas(client.post(f"/api/activo/{activo['id']}/venta", json={"precio": 50})) == ["activos", "transacciones"]


def test_pausar_recurrente(client):
    rec = client.post("/api/rec", json=REC).json()
    assert afectadas(client.post(f"/api/rec/{rec['id']}/pausar")) == ["recurrentes"]


@pytest.mark.parametrize("crear_tx,esperado", [(True, ["inversiones", "transacciones"]), (False, ["inversiones"])])
def test_crear_inversion_segun_crear_tx(client, crear_tx, esperado):
    assert afectadas(client.post("/api/inv", json={**INV, "crear_tx": crear_tx})) == esperado


@pytest.mark.parametrize("crear_tx,esperado", [(True, ["activos", "transacciones"]), (False, ["activos"])])
def test_crear_activo_segun_crear_tx(client, crear_tx, esperado):
    assert afectadas(client.post("/api/activo", json={**ACTIVO, "crear_tx": crear_tx})) == esperado


def test_crear_deuda_con_credito_recibido(client):
    body = {"nombre": "Credito", "monto_inicial": 1000, "saldo_actual": 1000, "tasa_ea": 24, "cuota_mensual": 100}
    assert afectadas(client.post("/api/deuda", json={**body, "crear_tx": True})) == ["deudas", "transacciones"]
    assert afectadas(client.post("/api/deuda", json=body)) == ["deudas"]


def test_editar_deuda_y_borrados(client, prestamo, inv, activo):
    assert afectadas(client.put(f"/api/deuda/{prestamo['id']}", json={
        "nombre": "Credito", "monto_inicial": 1_000_000, "saldo_actual": 1_000_000, "tasa_ea": 24,
        "cuota_mensual": 100_000})) == ["deudas"]
    assert afectadas(client.delete(f"/api/deuda/{prestamo['id']}")) == ["deudas", "transacciones"]
    assert afectadas(client.delete(f"/api/inv/{inv['id']}")) == ["inversiones"]
    assert afectadas(client.delete(f"/api/activo/{activo['id']}")) == ["activos"]
    rec = client.post("/api/rec", json=REC).json()
    assert afectadas(client.delete(f"/api/rec/{rec['id']}")) == ["recurrentes"]


def test_recurrente_crud(client):
    rec = client.post("/api/rec", json=REC)
    assert afectadas(rec) == ["recurrentes"]
    assert afectadas(client.put(f"/api/rec/{rec.json()['id']}", json=REC)) == ["recurrentes"]


def test_categorias_ajustes_y_ops_ocultas(client):
    assert afectadas(client.post("/api/categorias", json={"tipo": "gasto", "nombre": "Mascotas"})) == ["categorias"]
    assert afectadas(client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "Mascotas"})) == ["categorias"]
    assert afectadas(client.put("/api/ajustes", json={"moneda_simbolo": "€"})) == ["ajustes"]
    assert afectadas(client.post("/api/ops-ocultas", json={"clave": CLAVE})) == ["opsOcultas"]
    assert afectadas(client.delete("/api/ops-ocultas", params={"clave": CLAVE})) == ["opsOcultas"]
    assert afectadas(client.delete("/api/ops-ocultas")) == ["opsOcultas"]


from backend.tests.api.test_backup import importar, truncar


from backend.tests.api.test_backup import importar, truncar


def test_import_y_truncate_afectan_todo(client):
    assert afectadas(truncar(client)) == list(TODAS)
    backup = client.get("/api/backup").json()
    assert afectadas(importar(client, backup)) == list(TODAS)


def test_error_no_trae_header(client):
    r = client.put("/api/tx/999", json=TX)
    assert r.status_code == 404 and HEADER_AFECTADAS not in r.headers


def test_preview_y_lecturas_no_traen_header(client, prestamo):
    r = client.post(f"/api/deuda/{prestamo['id']}/pago/preview", json={"modo": "abono", "total_pagado": 100_000, "nuevo_saldo": 900_000})
    assert r.status_code == 200 and HEADER_AFECTADAS not in r.headers
    assert HEADER_AFECTADAS not in client.get("/api/meta").headers


def test_ruta_mutante_sin_declarar_recibe_todas(client):
    def sin_declarar():
        return {}

    app.router.add_api_route("/api/__sin_declarar", sin_declarar, methods=["POST"])
    ruta = app.router.routes.pop()
    app.router.routes.insert(0, ruta)
    try:
        assert afectadas(client.post("/api/__sin_declarar")) == list(TODAS)
    finally:
        app.router.routes.remove(ruta)
