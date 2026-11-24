import pytest

from backend.calculos.fechas import hoy_bogota


def _crear(client, **extra):
    body = {"nombre": "CDT", "tipo": "fija", "monto_invertido": 1000, **extra}
    return client.post("/api/inv", json=body).json()


def _inv(client, inv_id):
    return next(i for i in client.get("/api/backup").json()["inversiones"] if i["id"] == inv_id)


def test_crear_sin_valor_actual_usa_monto_y_fecha_inicio(client):
    inv = _crear(client, fecha_inicio="2026-03-01")
    assert inv["valor_actual"] == 1000
    assert inv["valor_actualizado_en"] == "2026-03-01"


def test_crear_sin_fechas_usa_hoy(client):
    inv = _crear(client)
    assert inv["fecha_inicio"] == hoy_bogota().isoformat()
    assert inv["valor_actualizado_en"] == inv["fecha_inicio"]


def test_crear_con_crear_tx_registra_el_gasto(client):
    inv = _crear(client, fecha_inicio="2026-03-01", crear_tx=True)
    tx = client.get("/api/backup").json()["transacciones"][0]
    assert (tx["tipo"], tx["monto"], tx["fecha"], tx["descripcion"]) == ("gasto", 1000, "2026-03-01", f"Nueva inversión · {inv['nombre']}")


@pytest.mark.parametrize("campos", [{"nombre": "   "}, {"monto_invertido": 0}, {"valor_actual": 0}])
def test_crear_rechaza_nombre_vacio_y_montos_cero(client, campos):
    body = {"nombre": "CDT", "tipo": "fija", "monto_invertido": 1000, **campos}
    assert client.post("/api/inv", json=body).status_code == 422


def test_editar_conserva_fecha_si_el_valor_no_cambia_y_usa_hoy_si_cambia(client):
    inv = _crear(client, valor_actual=1000, valor_actualizado_en="2026-01-05")
    base = {"nombre": "CDT", "tipo": "fija", "monto_invertido": 1000, "valor_actual": 1000}
    igual = client.put(f"/api/inv/{inv['id']}", json=base).json()
    assert igual["valor_actualizado_en"] == "2026-01-05"
    cambia = client.put(f"/api/inv/{inv['id']}", json={**base, "valor_actual": 1200}).json()
    assert cambia["valor_actualizado_en"] == hoy_bogota().isoformat()


def test_editar_respeta_fecha_explicita(client):
    inv = _crear(client)
    r = client.put(f"/api/inv/{inv['id']}", json={
        "nombre": "CDT", "tipo": "fija", "monto_invertido": 1000, "valor_actual": 900, "valor_actualizado_en": "2026-02-02",
    }).json()
    assert r["valor_actualizado_en"] == "2026-02-02"


def test_aporte_sin_nuevo_valor_suma_el_monto_al_valor_actual(client):
    inv = _crear(client, valor_actual=1200)
    client.post(f"/api/inv/{inv['id']}/aporte", json={"monto": 300, "fecha": "2026-05-01"})
    i = _inv(client, inv["id"])
    assert (i["monto_invertido"], i["valor_actual"]) == (1300, 1500)


def test_rendimiento_que_capitaliza_ignora_registrar_tx(client):
    inv = _crear(client, valor_actual=1000)
    client.post(f"/api/inv/{inv['id']}/rendimiento", json={
        "monto": 50, "fecha": "2026-05-01", "capitaliza": True, "registrar_tx": True,
    })
    estado = client.get("/api/backup").json()
    assert estado["transacciones"] == []
    assert _inv(client, inv["id"])["valor_actual"] == 1050
    assert _inv(client, inv["id"])["valor_actualizado_en"] == "2026-05-01"


@pytest.mark.parametrize("pago,esperado", [("vencimiento", True), ("mensual", False), (None, False)])
def test_capitaliza_default_segun_pago(client, pago, esperado):
    inv = _crear(client, pago=pago, dia_pago=15 if pago == "mensual" else None)
    assert client.get(f"/api/inv/{inv['id']}").json()["capitaliza_default"] is esperado


def test_retiro_total_borra_y_parcial_prorratea(client):
    inv = _crear(client, valor_actual=1000)
    r = client.post(f"/api/inv/{inv['id']}/retiro", json={"tipo": "parcial", "monto": 250, "saldo_queda": 750, "fecha": "2026-05-01"})
    assert r.status_code == 200
    i = _inv(client, inv["id"])
    assert (i["valor_actual"], i["monto_invertido"]) == (750, 750)
    assert client.post(f"/api/inv/{inv['id']}/retiro", json={"tipo": "total", "monto": 750, "fecha": "2026-05-01"}).status_code == 200
    assert client.get("/api/backup").json()["inversiones"] == []


def test_retiro_parcial_sin_saldo_o_con_saldo_mayor_da_400(client):
    inv = _crear(client, valor_actual=1000)
    url = f"/api/inv/{inv['id']}/retiro"
    base = {"tipo": "parcial", "monto": 100, "fecha": "2026-05-01"}
    assert client.post(url, json=base).status_code == 400
    assert client.post(url, json={**base, "saldo_queda": 5000}).status_code == 400


def test_resumen_trae_texto_de_posiciones_y_tipos(client):
    assert client.get("/api/inv/resumen").json()["texto_posiciones"] == "0 posiciones"
    _crear(client)
    assert client.get("/api/inv/resumen").json()["texto_posiciones"] == "1 posición"


def test_normaliza_segun_tipo_y_vacios(client):
    variable = _crear(client, tipo="variable", tasa_ea=12, pago="mensual", dia_pago=5)
    assert (variable["tasa_ea"], variable["pago"], variable["dia_pago"]) == (None, None, None)
    vencimiento = _crear(client, pago="vencimiento", dia_pago=15, tasa_ea=8)
    assert (vencimiento["tasa_ea"], vencimiento["pago"], vencimiento["dia_pago"]) == (8, "vencimiento", None)
    mensual = _crear(client, pago="mensual", dia_pago=15)
    assert mensual["dia_pago"] == 15
    crudo = _crear(client, tasa_ea="", dia_pago="", valor_actual="", pago="vencimiento")
    assert (crudo["tasa_ea"], crudo["dia_pago"], crudo["valor_actual"]) == (None, None, 1000)
    sin_tasa = _crear(client, tasa_ea=0)
    assert sin_tasa["tasa_ea"] is None


def test_valor_actualiza_valor_y_fecha(client):
    inv = _crear(client, tipo="variable", valor_actual=1000)
    r = client.post(f"/api/inv/{inv['id']}/valor", json={"nuevo_valor": 1234.6, "fecha": "2026-05-05"}).json()
    assert (r["valor_actual"], r["valor_actualizado_en"]) == (1235, "2026-05-05")
    sin_fecha = client.post(f"/api/inv/{inv['id']}/valor", json={"nuevo_valor": 900}).json()
    assert sin_fecha["valor_actualizado_en"] == hoy_bogota().isoformat()
    assert client.post("/api/inv/999/valor", json={"nuevo_valor": 1}).status_code == 404
    assert client.post(f"/api/inv/{inv['id']}/valor", json={"nuevo_valor": 0}).status_code == 422


def test_rendimiento_cuenta_de_un_solo_lado(client):
    inv = _crear(client, valor_actual=1000)
    base = {"monto": 50, "fecha": "2026-06-01"}
    cap = client.post(f"/api/inv/{inv['id']}/rendimiento", json={**base, "capitaliza": True}).json()
    assert cap["valor_actual"] == 1050 and client.get("/api/backup").json()["transacciones"] == []
    client.post(f"/api/inv/{inv['id']}/rendimiento", json=base)
    tx = client.get("/api/backup").json()["transacciones"]
    assert [(t["tipo"], t["monto"], t["descripcion"]) for t in tx] == [("ingreso", 50, "Rendimiento · CDT")]
    assert _inv(client, inv["id"])["valor_actual"] == 1050


def test_aporte_y_retiro_registran_tx_con_su_texto(client):
    inv = _crear(client, valor_actual=1000)
    client.post(f"/api/inv/{inv['id']}/aporte", json={"monto": 200, "fecha": "2026-06-01"})
    assert (_inv(client, inv["id"])["monto_invertido"], _inv(client, inv["id"])["valor_actual"]) == (1200, 1200)
    client.post(f"/api/inv/{inv['id']}/retiro", json={"tipo": "total", "monto": 1300, "fecha": "2026-06-02"})
    descripciones = [t["descripcion"] for t in client.get("/api/backup").json()["transacciones"]]
    assert descripciones == ["Aporte · CDT", "Retiro total · CDT"]
    assert [t["monto"] for t in client.get("/api/backup").json()["transacciones"]] == [200, 1300]
    assert client.get("/api/backup").json()["inversiones"] == []


def test_inv_tasa_tipo_mv_se_guarda_como_ea(client):
    base = {"nombre": "CDT", "tipo": "fija", "monto_invertido": 100, "valor_actual": 100, "tasa_ea": 1, "tasa_tipo": "mv"}
    creada = client.post("/api/inv", json=base).json()
    assert round(creada["tasa_ea"], 2) == 12.68 and "tasa_tipo" not in creada
    actualizada = client.put(f"/api/inv/{creada['id']}", json={**base, "tasa_ea": 24, "tasa_tipo": "ea"}).json()
    assert actualizada["tasa_ea"] == 24
    assert client.post("/api/inv", json={**base, "tasa_tipo": "x"}).status_code == 422
