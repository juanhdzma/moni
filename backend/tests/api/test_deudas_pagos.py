from .builders_api import editable


def _tx(client):
    return client.get("/api/backup").json()["transacciones"]


def _uno(client, entidad, id_):
    return next(x for x in client.get("/api/backup").json()[entidad] if x["id"] == id_)


def _deuda(client, id_):
    return _uno(client, "deudas", id_)


def _pago(client, deuda_id, **extra):
    body = {
        "modo": "abono", "nuevo_saldo": 900_000, "total_pagado": 100_000, "intereses": 0,
        "fecha": "2026-08-01", "descripcion": "Cuota", "registrar_tx": False,
    }
    body.update(extra)
    return client.post(f"/api/deuda/{deuda_id}/pago", json=body)


def test_pago_baja_saldo_acumula_intereses_y_deja_rastro(client, prestamo):
    client.post(
        f"/api/deuda/{prestamo['id']}/pago",
        json={"modo": "abono", "nuevo_saldo": 920_000, "total_pagado": 100_000, "intereses": 20_000,
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
            json={"modo": "abono", "nuevo_saldo": saldo, "total_pagado": 100_000, "intereses": interes,
                  "fecha": "2026-07-01", "descripcion": "Cuota"},
        )
    assert _uno(client, "deudas", prestamo["id"])["total_intereses"] == 38_000


def test_registrar_tx_false_no_ensucia_el_ledger(client, prestamo):
    client.post(
        f"/api/deuda/{prestamo['id']}/pago",
        json={"modo": "abono", "nuevo_saldo": 900_000, "total_pagado": 100_000, "fecha": "2026-07-01",
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


def test_pagar_la_cuota_corre_el_vencimiento_un_mes(client, prestamo):
    client.put(f"/api/deuda/{prestamo['id']}", json={**editable(prestamo), "proxima_cuota": "2026-08-05"})
    r = _pago(client, prestamo["id"], modo="cuota")
    assert r.json()["proxima_cuota"] == "2026-09-05"


def test_el_abono_extraordinario_no_corre_el_vencimiento(client, prestamo):
    client.put(f"/api/deuda/{prestamo['id']}", json={**editable(prestamo), "proxima_cuota": "2026-08-05"})
    r = _pago(client, prestamo["id"])
    assert r.json()["proxima_cuota"] == "2026-08-05"


def test_el_vencimiento_ancla_el_dia_en_meses_cortos(client, prestamo):
    client.put(f"/api/deuda/{prestamo['id']}", json={**editable(prestamo), "proxima_cuota": "2026-01-31"})
    r = _pago(client, prestamo["id"], modo="cuota")
    assert r.json()["proxima_cuota"] == "2026-02-28"


def test_saldar_la_deuda_limpia_el_vencimiento(client, prestamo):
    client.put(f"/api/deuda/{prestamo['id']}", json={**editable(prestamo), "proxima_cuota": "2026-08-05"})
    r = _pago(client, prestamo["id"], nuevo_saldo=0, total_pagado=1_000_000, modo="liquidar")
    assert r.json()["proxima_cuota"] == ""


def test_la_tarjeta_no_tiene_vencimiento_que_correr(client, tarjeta):
    r = _pago(client, tarjeta["id"], nuevo_saldo=0, total_pagado=50_000, modo="cuota")
    assert r.status_code == 200
    assert (r.json()["proxima_cuota"], r.json()["saldo_actual"]) == ("", 0)


def test_saldar_la_deuda_deja_el_saldo_exacto_en_cero(client, prestamo):
    client.post(
        f"/api/deuda/{prestamo['id']}/pago",
        json={
            "modo": "liquidar", "nuevo_saldo": 0.0000000001, "total_pagado": 1_000_000, "intereses": 0,
            "fecha": "2026-08-01", "descripcion": "Liquidación", "registrar_tx": False,
        },
    )
    d = _uno(client, "deudas", prestamo["id"])
    assert d["saldo_actual"] == 0


def test_el_modo_liquidar_exige_saldo_cero(client, prestamo):
    client.put(f"/api/deuda/{prestamo['id']}", json={**editable(prestamo), "proxima_cuota": "2026-08-05"})
    r = _pago(client, prestamo["id"], modo="liquidar")
    assert r.status_code == 400 and "liquidar" in r.json()["detail"]
    assert client.get(f"/api/deuda/{prestamo['id']}").json()["saldo_actual"] == prestamo["saldo_actual"]
    assert _pago(client, prestamo["id"], modo="liquidar", nuevo_saldo=0).json()["saldo_actual"] == 0


def test_el_pago_exige_modo(client, prestamo):
    body = {"nuevo_saldo": 900_000, "total_pagado": 100_000, "avanzar_cuota": True}
    r = client.post(f"/api/deuda/{prestamo['id']}/pago", json=body)
    assert r.status_code == 422
    assert r.json()["detail"][0]["loc"][-1] == "modo"
    assert r.json()["detail"][0]["msg"] == "Este valor es requerido"


def test_el_preview_exige_modo_y_rechaza_uno_desconocido(client, prestamo):
    url = f"/api/deuda/{prestamo['id']}/pago/preview"
    assert client.post(url, json={"total_pagado": 1, "nuevo_saldo": 0}).status_code == 422
    assert client.post(url, json={"modo": "x", "total_pagado": 1, "nuevo_saldo": 0}).status_code == 422


def test_pago_deriva_intereses_y_arma_la_descripcion(client, prestamo):
    r = client.post(f"/api/deuda/{prestamo['id']}/pago", json={"modo": "abono", "nuevo_saldo": 920_000, "total_pagado": 100_000})
    assert r.status_code == 200
    assert (r.json()["saldo_actual"], r.json()["total_intereses"]) == (920_000, 20_000)
    assert _deuda(client, prestamo["id"])["total_intereses"] == 20_000
    tx = _tx(client)[0]
    assert tx["descripcion"] == "Cuota · Credito (capital $80.000, intereses $20.000)"
    assert len(tx["fecha"]) == 16 and tx["fecha"][10] == "T"


def test_pago_respeta_descripcion_y_fecha_enviadas(client, prestamo):
    client.post(
        f"/api/deuda/{prestamo['id']}/pago",
        json={"modo": "abono", "nuevo_saldo": 900_000, "total_pagado": 100_000, "descripcion": "Mia", "fecha": "2026-07-01"},
    )
    assert (_tx(client)[0]["descripcion"], _tx(client)[0]["fecha"]) == ("Mia", "2026-07-01")


def test_pago_usa_el_simbolo_de_moneda_de_ajustes(client, prestamo):
    client.put("/api/ajustes", json={"moneda_simbolo": "US$"})
    client.post(f"/api/deuda/{prestamo['id']}/pago", json={"modo": "abono", "nuevo_saldo": 900_000, "total_pagado": 100_000})
    assert _tx(client)[0]["descripcion"] == "Cuota · Credito (capital US$100.000, intereses US$0)"


def test_pago_que_sube_el_saldo_se_rechaza(client, prestamo):
    r = client.post(f"/api/deuda/{prestamo['id']}/pago", json={"modo": "abono", "nuevo_saldo": 1_100_000, "total_pagado": 100})
    assert r.status_code == 400 and "no puede superar" in r.json()["detail"]


def test_pago_avanza_la_cuota_en_un_solo_update(client, prestamo):
    client.put(f"/api/deuda/{prestamo['id']}", json={**editable(prestamo), "proxima_cuota": "2026-01-31"})
    client.post(
        f"/api/deuda/{prestamo['id']}/pago",
        json={"modo": "cuota", "nuevo_saldo": 900_000, "total_pagado": 100_000},
    )
    assert _deuda(client, prestamo["id"])["proxima_cuota"] == "2026-02-28"
    client.post(f"/api/deuda/{prestamo['id']}/pago", json={"modo": "abono", "nuevo_saldo": 800_000, "total_pagado": 100_000})
    assert _deuda(client, prestamo["id"])["proxima_cuota"] == "2026-02-28"


def test_adelanto_deriva_saldo_desde_el_disponible(client, tarjeta):
    r = client.post(
        f"/api/deuda/{tarjeta['id']}/adelanto/preview", json={"monto": 100_000, "disponible_nuevo": 890_000}
    )
    assert r.json() == {"nuevo_saldo": 110_000, "comision": 10_000}
    r = client.post(f"/api/deuda/{tarjeta['id']}/adelanto", json={"monto": 100_000, "disponible_nuevo": 890_000})
    assert r.status_code == 200 and r.json()["saldo_actual"] == 110_000
    assert _deuda(client, tarjeta["id"])["saldo_actual"] == 110_000
    tx = _tx(client)[0]
    assert tx["descripcion"] == "Adelanto · Visa" and tx["tipo"] == "ingreso"


def test_adelanto_sin_saldo_ni_disponible_es_422(client, tarjeta):
    r = client.post(f"/api/deuda/{tarjeta['id']}/adelanto", json={"monto": 100})
    assert r.status_code == 422


def test_adelanto_por_disponible_exige_cupo(client):
    t = client.post("/api/deuda", json={"nombre": "Sin cupo", "clase_deuda": "tarjeta"}).json()
    r = client.post(f"/api/deuda/{t['id']}/adelanto", json={"monto": 100, "disponible_nuevo": 50})
    assert r.status_code == 400


def test_adelanto_a_un_prestamo_se_rechaza(client, prestamo):
    r = client.post(f"/api/deuda/{prestamo['id']}/adelanto", json={"monto": 100, "nuevo_saldo": 2_000_000})
    assert r.status_code == 400 and "tarjetas" in r.json()["detail"]
