"""Acciones que tocan dos tablas en una sola transacción SQLite."""


def _tx(client):
    return client.get("/api/all").json()["transacciones"]


def _uno(client, entidad, id_):
    return next(x for x in client.get("/api/all").json()[entidad] if x["id"] == id_)


def test_pago_baja_saldo_acumula_intereses_y_deja_rastro(client, prestamo):
    client.post(
        f"/api/deuda/{prestamo['id']}/pago",
        json={"nuevo_saldo": 920_000, "total_pagado": 100_000, "intereses": 20_000,
              "fecha": "2026-07-01", "descripcion": "Cuota 1"},
    )
    d = _uno(client, "deudas", prestamo["id"])
    assert d["saldo_actual"] == 920_000
    assert d["total_intereses"] == 20_000

    tx = _tx(client)
    assert len(tx) == 1
    assert tx[0]["tipo"] == "transfer" and tx[0]["monto"] == 100_000


def test_intereses_se_acumulan_entre_pagos(client, prestamo):
    for saldo, interes in ((920_000, 20_000), (850_000, 18_000)):
        client.post(
            f"/api/deuda/{prestamo['id']}/pago",
            json={"nuevo_saldo": saldo, "total_pagado": 100_000, "intereses": interes,
                  "fecha": "2026-07-01", "descripcion": "Cuota"},
        )
    assert _uno(client, "deudas", prestamo["id"])["total_intereses"] == 38_000


def test_registrar_tx_false_no_ensucia_el_ledger(client, prestamo):
    client.post(
        f"/api/deuda/{prestamo['id']}/pago",
        json={"nuevo_saldo": 900_000, "total_pagado": 100_000, "fecha": "2026-07-01",
              "descripcion": "x", "registrar_tx": False},
    )
    assert _tx(client) == []
    assert _uno(client, "deudas", prestamo["id"])["saldo_actual"] == 900_000


def test_adelanto_sube_la_deuda_y_registra_ingreso(client, tarjeta):
    client.post(
        f"/api/deuda/{tarjeta['id']}/adelanto",
        json={"monto": 200_000, "nuevo_saldo": 210_000, "fecha": "2026-07-01", "descripcion": "Avance"},
    )
    assert _uno(client, "deudas", tarjeta["id"])["saldo_actual"] == 210_000
    assert _tx(client)[0]["tipo"] == "ingreso"


def test_aporte_suma_a_invertido_y_fija_el_valor(client):
    inv = client.post(
        "/api/inv",
        json={"nombre": "Fondo", "tipo": "variable", "monto_invertido": 1000, "valor_actual": 1000},
    ).json()
    client.post(
        f"/api/inv/{inv['id']}/aporte",
        json={"monto": 500, "nuevo_valor": 1600, "fecha": "2026-07-05"},
    )
    i = _uno(client, "inversiones", inv["id"])
    assert (i["monto_invertido"], i["valor_actual"]) == (1500, 1600)
    assert i["valor_actualizado_en"] == "2026-07-05"


def test_rendimiento_suma_al_valor_actual(client):
    inv = client.post(
        "/api/inv",
        json={"nombre": "CDT", "tipo": "fija", "monto_invertido": 1000, "valor_actual": 1000, "tasa_ea": 12},
    ).json()
    client.post(f"/api/inv/{inv['id']}/rendimiento", json={"monto": 95, "fecha": "2026-07-01"})
    assert _uno(client, "inversiones", inv["id"])["valor_actual"] == 1095


def test_retiro_parcial_reduce_capital_a_prorrata(client):
    inv = client.post(
        "/api/inv",
        json={"nombre": "Fondo", "tipo": "variable", "monto_invertido": 1000, "valor_actual": 2000},
    ).json()
    # Retirar la mitad del valor deja la mitad del capital invertido.
    client.post(
        f"/api/inv/{inv['id']}/retiro",
        json={"tipo": "parcial", "monto": 1000, "saldo_queda": 1000, "fecha": "2026-07-01"},
    )
    i = _uno(client, "inversiones", inv["id"])
    assert (i["monto_invertido"], i["valor_actual"]) == (500, 1000)


def test_retiro_total_borra_la_inversion(client):
    inv = client.post(
        "/api/inv",
        json={"nombre": "CDT", "tipo": "fija", "monto_invertido": 1000, "valor_actual": 1100},
    ).json()
    client.post(f"/api/inv/{inv['id']}/retiro", json={"tipo": "total", "monto": 1100, "fecha": "2026-07-01"})
    assert client.get("/api/all").json()["inversiones"] == []
    assert _tx(client)[0]["monto"] == 1100


def test_venta_borra_el_activo_y_registra_ingreso(client):
    a = client.post(
        "/api/activo", json={"nombre": "Moto", "valor_inicial": 5000, "valor_actual": 4000}
    ).json()
    client.post(f"/api/activo/{a['id']}/venta", json={"precio": 4200, "fecha": "2026-07-01"})
    assert client.get("/api/all").json()["activos"] == []
    tx = _tx(client)[0]
    assert (tx["tipo"], tx["monto"], tx["categoria"]) == ("ingreso", 4200, "Venta activos")


def test_crear_deuda_con_crear_tx_registra_el_credito(client):
    client.post(
        "/api/deuda",
        json={"nombre": "Credito", "monto_inicial": 500_000, "saldo_actual": 500_000, "crear_tx": True},
    )
    tx = _tx(client)[0]
    assert (tx["tipo"], tx["monto"], tx["categoria"]) == ("ingreso", 500_000, "Crédito recibido")


def test_crear_tarjeta_nunca_registra_tx(client):
    client.post(
        "/api/deuda",
        json={"nombre": "Visa", "monto_inicial": 0, "saldo_actual": 0, "es_tarjeta": True, "crear_tx": True},
    )
    assert _tx(client) == []
