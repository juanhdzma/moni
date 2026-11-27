from .builders_api import editable, fila_guardada, txs_guardadas


def test_crear_deuda_con_crear_tx_registra_el_credito(client):
    client.post(
        "/api/deuda",
        json={"nombre": "Credito", "monto_inicial": 500_000, "saldo_actual": 500_000, "crear_tx": True},
    )
    tx = txs_guardadas(client)[0]
    assert (tx["tipo"], tx["monto"], tx["categoria"]) == ("ingreso", 500_000, "Crédito recibido")


def test_crear_tarjeta_nunca_registratxs_guardadas(client):
    client.post(
        "/api/deuda",
        json={"nombre": "Visa", "monto_inicial": 0, "saldo_actual": 0, "clase_deuda": "tarjeta", "crear_tx": True},
    )
    assert txs_guardadas(client) == []


def test_tarjeta_ignora_los_campos_de_prestamo(client):
    r = client.post(
        "/api/deuda",
        json={
            "nombre": "  Visa  ", "clase_deuda": "tarjeta", "monto_inicial": 5, "tasa_ea": 30, "cuota_mensual": 9,
            "fecha_inicio": "2026-01-01", "proxima_cuota": "2026-02-01", "cupo": 1000, "franquicia": "Visa",
            "crear_tx": True,
        },
    ).json()
    assert r["nombre"] == "Visa" and r["cupo"] == 1000 and r["franquicia"] == "Visa"
    assert (r["monto_inicial"], r["tasa_ea"], r["cuota_mensual"], r["fecha_inicio"], r["proxima_cuota"]) == (0, 0, 0, "", "")
    assert txs_guardadas(client) == []


def test_prestamo_ignora_cupo_y_exige_saldo(client):
    sin_saldo = client.post("/api/deuda", json={"nombre": "X", "monto_inicial": 100})
    assert sin_saldo.status_code == 422 and "Saldo requerido" in sin_saldo.text
    r = client.post("/api/deuda", json={"nombre": "X", "saldo_actual": 100, "cupo": 5, "franquicia": "Visa"}).json()
    assert (r["cupo"], r["franquicia"]) == (0, "")


def test_franquicia_invalida_y_nombre_vacio_son_422(client):
    base = {"nombre": "V", "clase_deuda": "tarjeta"}
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


def test_clase_deuda_sale_en_las_filas_y_progreso_no_pasa_de_100(client, prestamo):
    assert prestamo["clase_deuda"] == "prestamo"
    tarjeta = client.post("/api/deuda", json={"nombre": "Visa", "clase_deuda": "tarjeta", "cupo": 1000}).json()
    assert tarjeta["clase_deuda"] == "tarjeta"
    assert client.get(f"/api/deuda/{tarjeta['id']}").json()["clase_deuda"] == "tarjeta"
    sobrepagada = client.put(f"/api/deuda/{prestamo['id']}", json={**editable(prestamo), "monto_inicial": 100, "saldo_actual": 0})
    assert sobrepagada.json()["clase_deuda"] == "prestamo"
    creciente = client.put(f"/api/deuda/{prestamo['id']}", json={**editable(prestamo), "monto_inicial": 100, "saldo_actual": 500}).json()
    deuda = client.get(f"/api/deuda/{creciente['id']}").json()
    assert deuda["progreso_pct"] == 0 and "intereses_pagados" not in deuda


def test_credito_con_crear_tx_sin_fecha_usa_hoy_y_el_listado_responde(client):
    from backend.calculos.base.fechas import hoy_bogota

    deuda = client.post(
        "/api/deuda", json={"nombre": "Libre", "monto_inicial": 500_000, "saldo_actual": 500_000, "crear_tx": True}
    ).json()
    assert deuda["fecha_inicio"] == hoy_bogota().isoformat()
    assert txs_guardadas(client)[0]["fecha"] == deuda["fecha_inicio"]
    listado = client.get("/api/tx").json()["items"]
    assert [(t["monto"], t["categoria"], t["fecha"]) for t in listado] == [(500_000, "Crédito recibido", deuda["fecha_inicio"])]


def test_resumen_frases_de_tarjeta_texto_vacio_y_campos_retirados(client, tarjeta):
    r = client.get("/api/deudas/resumen").json()
    frases = r["tarjetas"][0]["frases"]
    assert frases["disponible_texto"] == "$1.000.000" and frases["intereses_texto"] is None
    assert r["tarjetas"][0]["tiene_cupo"] is True
    assert r["texto_vacio_creditos"] == {"titulo": "Sin créditos", "texto": "Agregá uno con el botón + de arriba."}
    assert "total_cuotas" not in r and "meses_restantes" not in r["tarjetas"][0]


def test_tiene_cupo_en_el_detalle(client, prestamo, tarjeta):
    assert client.get(f"/api/deuda/{tarjeta['id']}").json()["tiene_cupo"] is True
    assert client.get(f"/api/deuda/{prestamo['id']}").json()["tiene_cupo"] is False


def test_credito_saldado_se_puede_editar_pero_no_crear_sin_saldo(client):
    deuda = client.post("/api/deuda", json={"nombre": "X", "monto_inicial": 100, "saldo_actual": 100}).json()
    editada = client.put(f"/api/deuda/{deuda['id']}", json={"nombre": "X2", "monto_inicial": 100, "saldo_actual": 0})
    assert editada.status_code == 200
    assert (editada.json()["nombre"], editada.json()["saldo_actual"]) == ("X2", 0)
    assert client.post("/api/deuda", json={"nombre": "Y", "monto_inicial": 100}).status_code == 422


def test_montos_de_deuda_se_redondean_a_pesos(client):
    r = client.post("/api/deuda", json={
        "nombre": "P", "monto_inicial": 100.5, "saldo_actual": 100.5, "cuota_mensual": 10.5, "crear_tx": True,
    }).json()
    assert (r["monto_inicial"], r["saldo_actual"], r["cuota_mensual"]) == (101, 101, 11)
    assert [t["monto"] for t in client.get("/api/tx").json()["items"]] == [101]
    assert client.post("/api/deuda", json={"nombre": "P", "saldo_actual": 0.4}).status_code == 422


def test_clase_deuda_sale_en_las_filas_sin_es_tarjeta(client):
    t = client.post("/api/deuda", json={"nombre": "V", "clase_deuda": "tarjeta", "cupo": 10}).json()
    assert t["clase_deuda"] == "tarjeta" and "es_tarjeta" not in t
    p = client.post("/api/deuda", json={"nombre": "P", "saldo_actual": 5}).json()
    assert p["clase_deuda"] == "prestamo" and "es_tarjeta" not in p
    assert client.get(f"/api/deuda/{t['id']}").json()["clase_deuda"] == "tarjeta"
    resumen = client.get("/api/deudas/resumen").json()
    assert {d["clase_deuda"] for d in resumen["creditos"] + resumen["tarjetas"]} == {"tarjeta", "prestamo"}
    assert not {"es_tarjeta", "activa", "vigente"} & set(resumen["creditos"][0])
    assert client.post("/api/deuda", json={"nombre": "X", "clase_deuda": "otra"}).status_code == 422


def test_tasa_deuda_ea_a_dos_decimales_y_mv_convertida():
    from backend.calculos.operaciones import normalizar_tasa

    assert normalizar_tasa({"tasa_ea": 12.3456}) == {"tasa_ea": 12.35}
    assert normalizar_tasa({"tasa_ea": 1, "tasa_tipo": "mv"})["tasa_ea"] == 12.68


def test_es_tarjeta_en_el_body_se_rechaza_en_espanol(client, prestamo):
    body = {"nombre": "Visa", "es_tarjeta": True, "cupo": 1000}
    for r in (client.post("/api/deuda", json=body), client.put(f"/api/deuda/{prestamo['id']}", json=body)):
        assert r.status_code == 422
        assert r.json()["detail"][0]["msg"] == "es_tarjeta fue reemplazado por clase_deuda"


def test_sugerencia_de_pago_de_un_prestamo(client, prestamo):
    pago = client.get(f"/api/deuda/{prestamo['id']}").json()["pago"]
    assert pago["cuota"]["monto"] == 100_000 and pago["cuota"]["nuevo_saldo"] is None
    assert pago["abono"]["monto"] is None
    assert pago["liquidar"]["monto"] == 1_000_000 and pago["liquidar"]["nuevo_saldo"] == 0
    assert all(pago[m]["hint"] for m in pago)


def test_la_cuota_sugerida_no_pasa_del_saldo_y_sin_cuota_no_hay_monto(client, prestamo):
    url = f"/api/deuda/{prestamo['id']}"
    cuerpo = {**editable(prestamo), "saldo_actual": 40_000}
    client.put(url, json=cuerpo)
    assert client.get(url).json()["pago"]["cuota"]["monto"] == 40_000
    client.put(url, json={**cuerpo, "cuota_mensual": 0})
    sin_cuota = client.get(url).json()["pago"]["cuota"]
    assert sin_cuota["monto"] is None and sin_cuota["hint"] == "Ingresá el monto de la cuota."


def test_sugerencia_de_pago_de_una_tarjeta(client):
    t = client.post("/api/deuda", json={"nombre": "Visa", "clase_deuda": "tarjeta", "cupo": 1000, "saldo_actual": 300}).json()
    pago = client.get(f"/api/deuda/{t['id']}").json()["pago"]
    assert pago["cuota"]["monto"] is None
    assert pago["liquidar"]["monto"] == 300
