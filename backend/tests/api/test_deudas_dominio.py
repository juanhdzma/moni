def _tx(client):
    return client.get("/api/all").json()["transacciones"]


def _deuda(client, id_):
    return next(d for d in client.get("/api/all").json()["deudas"] if d["id"] == id_)


def test_pago_deriva_intereses_y_arma_la_descripcion(client, prestamo):
    r = client.post(f"/api/deuda/{prestamo['id']}/pago", json={"nuevo_saldo": 920_000, "total_pagado": 100_000})
    assert r.status_code == 200
    assert _deuda(client, prestamo["id"])["total_intereses"] == 20_000
    tx = _tx(client)[0]
    assert tx["descripcion"] == "Cuota · Credito (capital $80.000, intereses $20.000)"
    assert len(tx["fecha"]) == 16 and tx["fecha"][10] == "T"


def test_pago_respeta_descripcion_y_fecha_enviadas(client, prestamo):
    client.post(
        f"/api/deuda/{prestamo['id']}/pago",
        json={"nuevo_saldo": 900_000, "total_pagado": 100_000, "descripcion": "Mia", "fecha": "2026-07-01"},
    )
    assert (_tx(client)[0]["descripcion"], _tx(client)[0]["fecha"]) == ("Mia", "2026-07-01")


def test_pago_usa_el_simbolo_de_moneda_de_ajustes(client, prestamo):
    client.put("/api/ajustes", json={"moneda_simbolo": "COP"})
    client.post(f"/api/deuda/{prestamo['id']}/pago", json={"nuevo_saldo": 900_000, "total_pagado": 100_000})
    assert _tx(client)[0]["descripcion"] == "Cuota · Credito (capital COP100.000, intereses COP0)"


def test_pago_que_sube_el_saldo_se_rechaza(client, prestamo):
    r = client.post(f"/api/deuda/{prestamo['id']}/pago", json={"nuevo_saldo": 1_100_000, "total_pagado": 100})
    assert r.status_code == 400 and "no puede superar" in r.json()["detail"]


def test_pago_avanza_la_cuota_en_un_solo_update(client, prestamo):
    client.put(f"/api/deuda/{prestamo['id']}", json={**prestamo, "proxima_cuota": "2026-01-31"})
    client.post(
        f"/api/deuda/{prestamo['id']}/pago",
        json={"nuevo_saldo": 900_000, "total_pagado": 100_000, "avanzar_cuota": True},
    )
    assert _deuda(client, prestamo["id"])["proxima_cuota"] == "2026-02-28"
    client.post(f"/api/deuda/{prestamo['id']}/pago", json={"nuevo_saldo": 800_000, "total_pagado": 100_000})
    assert _deuda(client, prestamo["id"])["proxima_cuota"] == "2026-02-28"


def test_adelanto_deriva_saldo_desde_el_disponible(client, tarjeta):
    r = client.post(
        f"/api/deuda/{tarjeta['id']}/adelanto/preview", json={"monto": 100_000, "disponible_nuevo": 890_000}
    )
    assert r.json() == {"nuevo_saldo": 110_000, "comision": 10_000}
    r = client.post(f"/api/deuda/{tarjeta['id']}/adelanto", json={"monto": 100_000, "disponible_nuevo": 890_000})
    assert r.status_code == 200
    assert _deuda(client, tarjeta["id"])["saldo_actual"] == 110_000
    tx = _tx(client)[0]
    assert tx["descripcion"] == "Adelanto · Visa" and tx["tipo"] == "ingreso"


def test_adelanto_sin_saldo_ni_disponible_es_422(client, tarjeta):
    r = client.post(f"/api/deuda/{tarjeta['id']}/adelanto", json={"monto": 100})
    assert r.status_code == 422


def test_adelanto_por_disponible_exige_cupo(client):
    t = client.post("/api/deuda", json={"nombre": "Sin cupo", "es_tarjeta": True}).json()
    r = client.post(f"/api/deuda/{t['id']}/adelanto", json={"monto": 100, "disponible_nuevo": 50})
    assert r.status_code == 400


def test_adelanto_a_un_prestamo_se_rechaza(client, prestamo):
    r = client.post(f"/api/deuda/{prestamo['id']}/adelanto", json={"monto": 100, "nuevo_saldo": 2_000_000})
    assert r.status_code == 400 and "tarjetas" in r.json()["detail"]


def test_tarjeta_ignora_los_campos_de_prestamo(client):
    r = client.post(
        "/api/deuda",
        json={
            "nombre": "  Visa  ", "es_tarjeta": True, "monto_inicial": 5, "tasa_ea": 30, "cuota_mensual": 9,
            "fecha_inicio": "2026-01-01", "proxima_cuota": "2026-02-01", "cupo": 1000, "franquicia": "Visa",
            "crear_tx": True,
        },
    ).json()
    assert r["nombre"] == "Visa" and r["cupo"] == 1000 and r["franquicia"] == "Visa"
    assert (r["monto_inicial"], r["tasa_ea"], r["cuota_mensual"], r["fecha_inicio"], r["proxima_cuota"]) == (0, 0, 0, "", "")
    assert _tx(client) == []


def test_prestamo_ignora_cupo_y_exige_saldo(client):
    sin_saldo = client.post("/api/deuda", json={"nombre": "X", "monto_inicial": 100})
    assert sin_saldo.status_code == 422 and "Saldo requerido" in sin_saldo.text
    r = client.post("/api/deuda", json={"nombre": "X", "saldo_actual": 100, "cupo": 5, "franquicia": "Visa"}).json()
    assert (r["cupo"], r["franquicia"]) == (0, "")


def test_franquicia_invalida_y_nombre_vacio_son_422(client):
    base = {"nombre": "V", "es_tarjeta": True}
    assert client.post("/api/deuda", json={**base, "franquicia": "Diners"}).status_code == 422
    assert client.post("/api/deuda", json={**base, "nombre": "   "}).status_code == 422


def test_resumen_trae_frases_resueltas(client, prestamo, tarjeta):
    r = client.get("/api/deudas/resumen").json()
    assert r["dato"] == {
        "cuotas": "$100.000", "cuotas_sufijo": "/mes en cuotas",
        "intereses": None, "intereses_sufijo": "pagados en intereses",
    }
    credito = r["creditos"][0]["frases"]
    assert credito["detalle"] == "24,0% EA · $100.000/mes"
    assert credito["progreso_texto"] == "0,0% pagado"
    assert r["tarjetas"][0]["frases"]["detalle"] == "Cupo $1.000.000"


def test_get_deuda_devuelve_frases_como_el_resumen(client, prestamo):
    deuda = client.get(f"/api/deuda/{prestamo['id']}").json()
    resumen = client.get("/api/deudas/resumen").json()
    assert deuda["frases"] == resumen["creditos"][0]["frases"]


def test_normalizar_tasa_convierte_mv_a_ea():
    from backend.calculos.operaciones import normalizar_tasa

    assert normalizar_tasa({"tasa_ea": 12.5}) == {"tasa_ea": 12.5}
    convertida = normalizar_tasa({"tasa_ea": 2, "tasa_tipo": "mv"})
    assert "tasa_tipo" not in convertida and convertida["tasa_ea"] > 26


def test_es_tarjeta_sale_como_bool_y_progreso_no_pasa_de_100(client, prestamo):
    assert prestamo["es_tarjeta"] is False
    tarjeta = client.post("/api/deuda", json={"nombre": "Visa", "es_tarjeta": True, "cupo": 1000}).json()
    assert tarjeta["es_tarjeta"] is True
    assert client.get(f"/api/deuda/{tarjeta['id']}").json()["es_tarjeta"] is True
    sobrepagada = client.put(f"/api/deuda/{prestamo['id']}", json={**prestamo, "monto_inicial": 100, "saldo_actual": 0})
    assert sobrepagada.json()["es_tarjeta"] is False
    creciente = client.put(f"/api/deuda/{prestamo['id']}", json={**prestamo, "monto_inicial": 100, "saldo_actual": 500}).json()
    deuda = client.get(f"/api/deuda/{creciente['id']}").json()
    assert deuda["progreso_pct"] == 0 and "intereses_pagados" not in deuda
