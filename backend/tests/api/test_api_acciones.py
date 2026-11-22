import datetime

import pytest

from .builders import ACTIVO_DERIVADOS, DEUDA_DERIVADOS, HOY, HOY_ISO, INV_DERIVADOS, MES, REC_DERIVADOS, TX_DERIVADOS, TX_KEYS, sembrar, tx


def test_calc_tasa(client):
    ea = client.get("/api/calc/tasa", params={"valor": 12.68, "tipo": "ea"}).json()
    assert set(ea) == {"ea", "mv"} and ea["ea"] == 12.68 and round(ea["mv"], 2) == 1.0
    mv = client.get("/api/calc/tasa", params={"valor": 1, "tipo": "mv"}).json()
    assert mv["mv"] == 1 and round(mv["ea"], 2) == 12.68
    assert client.get("/api/calc/tasa", params={"valor": 0}).json() == {"ea": None, "mv": None}
    assert client.get("/api/calc/tasa", params={"valor": 1, "tipo": "x"}).status_code == 422


def test_inv_tasa_tipo_mv_se_guarda_como_ea(client):
    base = {"nombre": "CDT", "tipo": "fija", "monto_invertido": 100, "valor_actual": 100, "tasa_ea": 1, "tasa_tipo": "mv"}
    creada = client.post("/api/inv", json=base).json()
    assert round(creada["tasa_ea"], 2) == 12.68 and "tasa_tipo" not in creada
    actualizada = client.put(f"/api/inv/{creada['id']}", json={**base, "tasa_ea": 24, "tasa_tipo": "ea"}).json()
    assert actualizada["tasa_ea"] == 24
    assert client.post("/api/inv", json={**base, "tasa_tipo": "x"}).status_code == 422


def test_previews_de_deuda(client, prestamo, tarjeta):
    r = client.post(f"/api/deuda/{prestamo['id']}/pago/preview", json={"total_pagado": 150_000, "nuevo_saldo": 900_000})
    assert r.status_code == 200 and r.json() == {"capital": 100_000, "intereses": 50_000}
    r = client.post(f"/api/deuda/{tarjeta['id']}/adelanto/preview", json={"monto": 100_000, "nuevo_saldo": 110_000})
    assert r.json() == {"comision": 10_000}
    assert client.post("/api/deuda/999/pago/preview", json={"total_pagado": 1, "nuevo_saldo": 0}).status_code == 404
    assert client.get(f"/api/deuda/{prestamo['id']}").status_code in (404, 405)
    assert client.get("/api/deudas/resumen").json()["creditos"][0]["saldo_actual"] == 1_000_000


def test_previews_de_inversion(client):
    inv = client.post("/api/inv", json={"nombre": "A", "tipo": "variable", "monto_invertido": 1000, "valor_actual": 1200}).json()
    r = client.post(f"/api/inv/{inv['id']}/valor/preview", json={"nuevo_valor": 1500})
    assert r.json() == {"delta": 300, "total": 500, "total_pct": 50.0}
    r = client.post(f"/api/inv/{inv['id']}/aporte/preview", json={"monto": 300})
    assert r.json() == {"nuevo_valor_estimado": 1500}
    assert client.post("/api/inv/999/valor/preview", json={"nuevo_valor": 1}).status_code == 404
    assert client.get("/api/inv/resumen").json()["variables"][0]["valor_actual"] == 1200


def test_previews_de_activo(client):
    a = client.post("/api/activo", json={"nombre": "Casa", "valor_inicial": 1000, "valor_actual": 1200}).json()
    r = client.post(f"/api/activo/{a['id']}/valor/preview", json={"nuevo_valor": 1500})
    assert r.json() == {"delta": 300, "total": 500, "total_pct": 50.0}
    r = client.post(f"/api/activo/{a['id']}/venta/preview", json={"precio": 1100})
    assert r.json() == {"vs_inicial": 100, "vs_actual": -100}
    assert client.post("/api/activo/999/venta/preview", json={"precio": 1}).status_code == 404
    assert client.get("/api/activos/resumen").json()["items"][0]["valor_actual"] == 1200


def test_previews_exigen_header_csrf(client, prestamo):
    client.headers.pop("x-moni-request")
    r = client.post(f"/api/deuda/{prestamo['id']}/pago/preview", json={"total_pagado": 1, "nuevo_saldo": 0})
    assert r.status_code == 403


def test_proximas_operaciones_forma_y_no_poda(client):
    s = sembrar(client)
    r = client.get("/api/proximas-operaciones").json()
    assert set(r) == {"hoy", "items", "vencidas", "salen_total"}
    assert r["hoy"] == HOY_ISO
    deuda = next(i for i in r["items"] if i["tipo"] == "deuda")
    assert set(deuda) == {
        "clave", "tipo", "fuente_id", "fecha", "dia", "mes_corto", "etiqueta", "sub", "monto", "dias", "texto_dias", "vencida",
    }
    fecha = (HOY + datetime.timedelta(days=3)).isoformat()
    assert deuda["clave"] == f"deuda:{s['deuda']['id']}:{fecha}"
    assert (deuda["monto"], deuda["dias"], deuda["texto_dias"], deuda["vencida"], deuda["sub"]) == (-100_000, 3, "en 3d", False, "Cuota deuda")
    assert r["salen_total"] >= 100_000

    assert client.post("/api/ops-ocultas", json={"clave": deuda["clave"]}).status_code == 201
    assert client.post("/api/ops-ocultas", json={"clave": "deuda:999:2020-01-01"}).status_code == 201
    r2 = client.get("/api/proximas-operaciones").json()
    assert deuda["clave"] not in [i["clave"] for i in r2["items"]]
    claves = [i["clave"] for i in client.get("/api/ops-ocultas").json()["items"]]
    assert claves == [deuda["clave"], "deuda:999:2020-01-01"]


def test_ops_ocultas_crud(client):
    s = sembrar(client)
    clave = f"deuda:{s['deuda']['id']}:2026-11-25"
    assert client.get("/api/ops-ocultas").json() == {"items": []}
    r = client.post("/api/ops-ocultas", json={"clave": clave})
    assert r.status_code == 201 and r.json() == {"clave": clave}
    assert client.post("/api/ops-ocultas", json={"clave": clave}).status_code == 201
    items = client.get("/api/ops-ocultas").json()["items"]
    assert items == [{"clave": clave, "tipo": "deuda", "fuente_id": s["deuda"]["id"], "fecha": "2026-11-25", "etiqueta": "Credito"}]
    client.post("/api/ops-ocultas", json={"clave": "inversion:999:2026-11-25"})
    assert client.get("/api/ops-ocultas").json()["items"][1]["etiqueta"] is None
    assert client.delete("/api/ops-ocultas", params={"clave": clave}).status_code == 204
    assert client.delete("/api/ops-ocultas", params={"clave": clave}).status_code == 404
    assert client.delete("/api/ops-ocultas").status_code == 204
    assert client.get("/api/ops-ocultas").json() == {"items": []}


@pytest.mark.parametrize("clave", ["", "x:1:2026-01-01", "deuda:a:2026-01-01", "deuda:1:2026-13-45", "deuda:1:2026-1-1"])
def test_ops_ocultas_rechaza_claves_invalidas(client, clave):
    assert client.post("/api/ops-ocultas", json={"clave": clave}).status_code == 422


def test_ops_ocultas_exigen_header_csrf(client):
    client.headers.pop("x-moni-request")
    assert client.post("/api/ops-ocultas", json={"clave": "deuda:1:2026-01-01"}).status_code == 403
    assert client.delete("/api/ops-ocultas").status_code == 403


def test_op_clave_se_oculta_atomicamente_en_tx_pago_y_rendimiento(client, prestamo):
    clave_tx = "recurrente:1:2026-01-01"
    assert client.post("/api/tx", json={"fecha": HOY_ISO, "tipo": "gasto", "categoria": "x", "monto": 1, "op_clave": clave_tx}).status_code == 200
    clave_pago = f"deuda:{prestamo['id']}:2026-01-01"
    body = {"nuevo_saldo": 900_000, "total_pagado": 100_000, "fecha": HOY_ISO, "descripcion": "p", "op_clave": clave_pago}
    assert client.post(f"/api/deuda/{prestamo['id']}/pago", json=body).status_code == 200
    inv = client.post("/api/inv", json={"nombre": "C", "tipo": "fija", "monto_invertido": 10, "valor_actual": 10}).json()
    clave_rend = f"inversion:{inv['id']}:2026-01-01"
    assert client.post(f"/api/inv/{inv['id']}/rendimiento", json={"monto": 5, "fecha": HOY_ISO, "op_clave": clave_rend}).status_code == 200
    claves = {i["clave"] for i in client.get("/api/ops-ocultas").json()["items"]}
    assert claves == {clave_tx, clave_pago, clave_rend}


def test_op_clave_no_oculta_si_la_mutacion_falla(client, prestamo):
    body = {"nuevo_saldo": 2_000_000, "total_pagado": 1, "fecha": HOY_ISO, "descripcion": "p", "op_clave": "deuda:1:2026-01-01"}
    assert client.post(f"/api/deuda/{prestamo['id']}/pago", json=body).status_code == 400
    assert client.post("/api/tx", json={"fecha": HOY_ISO, "tipo": "gasto", "categoria": "x", "monto": 1, "op_clave": "mala"}).status_code == 422
    assert client.get("/api/ops-ocultas").json() == {"items": []}


def test_categorias_crud(client):
    base = client.get("/api/categorias").json()
    assert set(base) == {"ingreso", "gasto", "transfer"}
    assert base["gasto"] == [{"nombre": "Inversión", "sistema": True}, {"nombre": "Compra activos", "sistema": True}]
    r = client.post("/api/categorias", json={"tipo": "gasto", "nombre": "  Mascotas "})
    assert r.status_code == 201
    assert r.json()["gasto"][-1] == {"nombre": "Mascotas", "sistema": False}
    assert client.get("/api/categorias").json() == r.json()
    assert client.get("/api/all").json()["categorias"] == r.json()
    r = client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "Mascotas"})
    assert r.status_code == 200 and r.json() == base


def test_categorias_errores(client):
    client.post("/api/categorias", json={"tipo": "ingreso", "nombre": "Extra"})
    assert client.post("/api/categorias", json={"tipo": "ingreso", "nombre": "Extra"}).status_code == 409
    assert client.post("/api/categorias", json={"tipo": "gasto", "nombre": "Inversión"}).status_code == 409
    assert client.post("/api/categorias", json={"tipo": "gasto", "nombre": "   "}).status_code == 422
    assert client.post("/api/categorias", json={"tipo": "otro", "nombre": "x"}).status_code == 422
    assert client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "Inversión"}).status_code == 409
    assert client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "Nada"}).status_code == 404
    client.headers.pop("x-moni-request")
    assert client.post("/api/categorias", json={"tipo": "gasto", "nombre": "z"}).status_code == 403
    assert client.delete("/api/categorias", params={"tipo": "gasto", "nombre": "z"}).status_code == 403


def test_ajustes(client):
    assert client.get("/api/ajustes").json() == {"moneda_simbolo": "$"}
    assert client.put("/api/ajustes", json={"moneda_simbolo": " US$ "}).json() == {"moneda_simbolo": "US$"}
    assert client.get("/api/ajustes").json() == {"moneda_simbolo": "US$"}
    assert client.get("/api/all").json()["ajustes"] == {"moneda_simbolo": "US$"}
    for malo in ["", "   ", "12345", "a\nb"]:
        assert client.put("/api/ajustes", json={"moneda_simbolo": malo}).status_code == 422
    client.headers.pop("x-moni-request")
    assert client.put("/api/ajustes", json={"moneda_simbolo": "$"}).status_code == 403


def test_migrar_local_es_idempotente_e_ignora_basura(client):
    body = {
        "categorias": {"gasto": ["Mascotas", "Inversión", "  ", "Mascotas"], "ingreso": ["Freelance"], "raro": ["x"]},
        "ops_ocultas": ["deuda:3:2026-11-25", "basura", "recurrente:1:2026-12-01"],
        "moneda_simbolo": "COP",
    }
    r = client.post("/api/migrar-local", json=body)
    assert r.status_code == 200
    assert r.json() == {"categorias": 2, "ops_ocultas": 2, "moneda_simbolo": True}
    assert client.post("/api/migrar-local", json=body).json() == {"categorias": 0, "ops_ocultas": 0, "moneda_simbolo": False}
    assert client.get("/api/ajustes").json() == {"moneda_simbolo": "COP"}
    assert client.post("/api/migrar-local", json={"moneda_simbolo": "demasiado"}).json()["moneda_simbolo"] is False
    assert client.post("/api/migrar-local", json={}).json() == {"categorias": 0, "ops_ocultas": 0, "moneda_simbolo": False}


def test_truncate_vacia_categorias_y_ops_pero_no_ajustes(client):
    client.post("/api/categorias", json={"tipo": "gasto", "nombre": "Extra"})
    client.post("/api/ops-ocultas", json={"clave": "deuda:1:2026-01-01"})
    client.put("/api/ajustes", json={"moneda_simbolo": "US$"})
    assert client.post("/api/truncate").status_code == 200
    assert client.get("/api/categorias").json()["gasto"] == [
        {"nombre": "Inversión", "sistema": True},
        {"nombre": "Compra activos", "sistema": True},
    ]
    assert client.get("/api/ops-ocultas").json() == {"items": []}
    assert client.get("/api/ajustes").json() == {"moneda_simbolo": "US$"}
