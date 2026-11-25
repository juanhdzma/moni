import pytest

INV_OK = {"nombre": "CDT", "tipo": "fija", "monto_invertido": 1000, "tasa_ea": 10, "fecha_inicio": "2026-01-01"}
TX_OK = {"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 100}


@pytest.mark.parametrize(
    "patch",
    [
        {"tipo": "banana"},
        {"monto": -999},
        {"monto": 0},
        {"fecha": "nope"},
        {"fecha": "01/07/2026"},
        {"fecha": ""},
        {"categoria": ""},
    ],
    ids=["tipo-invalido", "monto-negativo", "monto-cero", "fecha-basura", "fecha-no-iso", "fecha-vacia", "sin-categoria"],
)
def test_tx_invalida_es_rechazada(client, patch):
    assert client.post("/api/tx", json={**TX_OK, **patch}).status_code == 422


@pytest.mark.parametrize("fecha", ["2026-07-01", "2026-07-01T14:30"])
def test_formatos_de_fecha_validos(client, fecha):
    assert client.post("/api/tx", json={**TX_OK, "fecha": fecha}).status_code == 200


def test_inversion_con_tipo_invalido(client):
    r = client.post(
        "/api/inv",
        json={"nombre": "X", "tipo": "cripto", "monto_invertido": 100, "valor_actual": 100},
    )
    assert r.status_code == 422


def test_recurrente_con_frecuencia_invalida(client):
    r = client.post(
        "/api/rec",
        json={"nombre": "Netflix", "tipo": "gasto", "monto": 100, "frecuencia": "cada_luna_llena"},
    )
    assert r.status_code == 422


def test_dia_pago_fuera_de_rango(client):
    r = client.post(
        "/api/inv",
        json={"nombre": "CDT", "tipo": "fija", "monto_invertido": 100, "valor_actual": 100,
              "pago": "mensual", "dia_pago": 45},
    )
    assert r.status_code == 422


def test_adelanto_no_puede_bajar_el_saldo(client, tarjeta):
    client.post("/api/tx", json={**TX_OK, "monto": 500, "tarjeta_id": tarjeta["id"]})
    r = client.post(
        f"/api/deuda/{tarjeta['id']}/adelanto",
        json={"monto": 100, "nuevo_saldo": 0, "fecha": "2026-07-01", "descripcion": "x"},
    )
    assert r.status_code == 400


def test_no_encontrado_usa_nombre_legible_de_la_entidad(client):
    assert client.get("/api/tx/999").json() == {"detail": "Movimiento 999 no encontrado"}
    assert client.get("/api/deuda/999").json() == {"detail": "Deuda 999 no encontrado"}


def test_listar_tx_rechaza_tipo_invalido(client):
    assert client.get("/api/tx", params={"tipo": "otro"}).status_code == 422
    assert client.get("/api/tx", params={"tipo": "gasto"}).status_code == 200


@pytest.mark.parametrize("fecha", ["2026-13-45", "2026-02-30", "2026-07-01T25:99"])
def test_fecha_con_formato_pero_inexistente_es_422(client, fecha):
    assert client.post("/api/tx", json={**TX_OK, "fecha": fecha}).status_code == 422


def test_fecha_inexistente_en_cuota_de_deuda_es_422_y_no_500(client, prestamo):
    r = client.post(f"/api/deuda/{prestamo['id']}/pago", json={"modo": "abono", "nuevo_saldo": 0, "total_pagado": 10, "fecha": "2026-13-45"})
    assert r.status_code == 422


@pytest.mark.parametrize("literal", ["Infinity", "-Infinity", "NaN"])
def test_monto_infinito_o_nan_es_422(client, literal):
    cuerpo = '{"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": %s}' % literal
    r = client.post("/api/tx", content=cuerpo, headers={"content-type": "application/json"})
    assert r.status_code == 422


def test_monto_infinito_en_activo_es_422(client):
    cuerpo = '{"nombre": "Casa", "valor_inicial": Infinity}'
    r = client.post("/api/activo", content=cuerpo, headers={"content-type": "application/json"})
    assert r.status_code == 422
    assert r.json()["detail"][0]["msg"] == "Debe ser un número finito"


@pytest.mark.parametrize(
    "ruta, cuerpo",
    [
        ("/api/activo", {"valor_inicial": 100}),
        ("/api/rec", {"tipo": "gasto", "monto": 100, "frecuencia": "mensual"}),
        ("/api/inv", {"tipo": "variable", "monto_invertido": 100}),
        ("/api/deuda", {"saldo_actual": 100}),
    ],
)
def test_nombre_solo_espacios_es_422(client, ruta, cuerpo):
    assert client.post(ruta, json={**cuerpo, "nombre": "   "}).status_code == 422
    assert client.post(ruta, json={**cuerpo, "nombre": "  Ok  "}).json()["nombre"] == "Ok"


def test_monto_de_tx_se_redondea_a_pesos_y_rechaza_lo_que_redondea_a_cero(client):
    r = client.post("/api/tx", json={**TX_OK, "monto": 10.6})
    assert r.status_code == 200 and r.json()["monto"] == 11
    assert client.post("/api/tx", json={**TX_OK, "monto": 0.4}).status_code == 422


_CUERPO_INV = {"nombre": "X", "tipo": "fija", "monto_invertido": 1}
_CUERPO_ACTIVO = {"nombre": "X", "valor_inicial": 1}


@pytest.mark.parametrize(
    "metodo, ruta, cuerpo",
    [
        ("delete", "/api/deuda/9999", None),
        ("delete", "/api/inv/999", None),
        ("delete", "/api/activo/999", None),
        ("put", "/api/inv/999", _CUERPO_INV),
        ("put", "/api/activo/999", _CUERPO_ACTIVO),
        ("post", "/api/inv/9999/rendimiento", {"monto": 100, "fecha": "2026-07-01"}),
        ("get", "/api/tx/9999", None),
        ("get", "/api/deuda/9999", None),
        ("get", "/api/inv/9999", None),
        ("get", "/api/rec/9999", None),
    ],
)
def test_404_en_entidad_inexistente(client, metodo, ruta, cuerpo):
    kwargs = {} if cuerpo is None else {"json": cuerpo}
    assert getattr(client, metodo)(ruta, **kwargs).status_code == 404


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


def _ledger(client):
    return client.get("/api/backup").json()["transacciones"]


def test_acciones_compuestas_redondean_el_monto_con_pesos(client, prestamo):
    from backend.calculos.numeros import pesos

    inv = client.post("/api/inv", json={"nombre": "F", "tipo": "variable", "monto_invertido": 1000, "valor_actual": 1000}).json()
    activo = client.post("/api/activo", json={"nombre": "Moto", "valor_inicial": 5000, "valor_actual": 4000}).json()
    esperado = pesos(100.6)
    assert esperado == 101
    assert client.post(f"/api/deuda/{prestamo['id']}/pago", json={"modo": "abono", "nuevo_saldo": 900_000, "total_pagado": 100.6, "fecha": "2026-07-01"}).status_code == 200
    client.post(f"/api/inv/{inv['id']}/aporte", json={"monto": 100.6, "fecha": "2026-07-01"})
    assert client.post(f"/api/inv/{inv['id']}/rendimiento", json={"monto": 100.6, "fecha": "2026-07-01"}).status_code == 200
    client.post(f"/api/inv/{inv['id']}/retiro", json={"tipo": "parcial", "monto": 100.6, "saldo_queda": 900, "fecha": "2026-07-01"})
    assert client.post(f"/api/activo/{activo['id']}/venta", json={"precio": 100.6, "fecha": "2026-07-01"}).status_code == 200
    montos = [t["monto"] for t in _ledger(client)]
    assert len(montos) == 5 and all(m == esperado for m in montos)


def test_accion_compuesta_con_monto_que_redondea_a_cero_es_422(client):
    inv = client.post("/api/inv", json={"nombre": "F", "tipo": "variable", "monto_invertido": 1000}).json()
    r = client.post(f"/api/inv/{inv['id']}/aporte", json={"monto": 0.3, "fecha": "2026-07-01"})
    assert r.status_code == 422


def test_fecha_con_espacio_se_guarda_normalizada(client):
    r = client.post("/api/tx", json={**TX_OK, "fecha": "2026-07-01 14:30:59"})
    assert r.status_code == 200 and r.json()["fecha"] == "2026-07-01T14:30"


@pytest.mark.parametrize(
    "campo,largo",
    [("descripcion", 121), ("notas", 201), ("categoria", 26)],
)
def test_textos_de_tx_tienen_tope(client, campo, largo):
    r = client.post("/api/tx", json={**TX_OK, campo: "x" * largo})
    assert r.status_code == 422 and "demasiado largo" in r.json()["detail"][0]["msg"]
    assert client.post("/api/tx", json={**TX_OK, campo: "x" * (largo - 1)}).status_code == 200


def test_nombre_tiene_tope(client):
    r = client.post("/api/activo", json={"nombre": "x" * 41, "valor_inicial": 1000})
    assert r.status_code == 422 and "máximo 40" in r.json()["detail"][0]["msg"]


def test_dia_de_pago_tiene_el_tope_de_meta(client):
    tope = client.get("/api/meta").json()["limites"]["dia_pago_max"]
    base = {**INV_OK, "pago": "mensual"}
    assert client.post("/api/inv", json={**base, "dia_pago": tope}).status_code == 200
    assert client.post("/api/inv", json={**base, "dia_pago": tope + 1}).status_code == 422


@pytest.mark.parametrize("cuerpo", [[], {"monto": []}, {**TX_OK, "monto": None}, {**TX_OK, "notas": 5}])
def test_422_nunca_deja_mensajes_en_ingles(client, cuerpo):
    r = client.post("/api/tx", json=cuerpo)
    assert r.status_code == 422
    for e in r.json()["detail"]:
        assert "Input should" not in e["msg"] and "Field required" not in e["msg"] and "valid" not in e["msg"]


def test_simbolo_fuera_de_monedas_es_422(client):
    assert client.put("/api/ajustes", json={"moneda_simbolo": "COP"}).status_code == 422
    assert client.put("/api/ajustes", json={"moneda_simbolo": "€"}).status_code == 200


def test_transaccion_rechaza_textos_mas_largos_que_el_tope(client):
    base = {"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 100}
    for campo, largo in (("descripcion", 121), ("notas", 201), ("categoria", 26)):
        r = client.post("/api/tx", json={**base, campo: "x" * largo})
        assert r.status_code == 422, campo
        assert "demasiado largo" in r.json()["detail"][0]["msg"]


@pytest.mark.parametrize(
    "ruta,cuerpo",
    [
        ("/api/ajustes", {"moneda_simbolo": "$", "extra": 1}),
        ("/api/ops-ocultas", {"clave": "deuda:1:2026-01-01", "extra": 1}),
        ("/api/deuda", {"nombre": "X", "saldo_actual": 10, "extra": 1}),
    ],
)
def test_entradas_rechazan_campos_desconocidos_en_espanol(client, ruta, cuerpo):
    r = (client.put if ruta == "/api/ajustes" else client.post)(ruta, json=cuerpo)
    assert r.status_code == 422
    assert r.json()["detail"][0]["msg"] == "Campo no permitido"
