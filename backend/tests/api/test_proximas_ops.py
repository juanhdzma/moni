import datetime

import pytest

from .builders_api import HOY, HOY_ISO, sembrar


def test_proximas_operaciones_forma_y_no_poda(client):
    s = sembrar(client)
    r = client.get("/api/proximas-operaciones").json()
    assert set(r) == {"hoy", "items", "extra", "texto_ver_todas", "vencidas", "visibles", "frase", "texto_vacio"}
    assert r["hoy"] == HOY_ISO
    deuda = next(i for i in r["items"] if i["tipo"] == "deuda")
    assert set(deuda) == {
        "clave", "tipo", "fuente_id", "fecha", "dia", "mes_corto", "etiqueta", "sub", "monto", "dias", "texto_dias", "vencida",
    }
    fecha = (HOY + datetime.timedelta(days=3)).isoformat()
    assert deuda["clave"] == f"deuda:{s['deuda']['id']}:{fecha}"
    assert (deuda["monto"], deuda["dias"], deuda["texto_dias"], deuda["vencida"], deuda["sub"]) == (-100_000, 3, "en 3d", False, "Cuota deuda")

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
