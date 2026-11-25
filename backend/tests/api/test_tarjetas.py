from backend.core.db import conexion


def _gasto(client, tarjeta_id, monto, **kw):
    body = {"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": monto}
    if tarjeta_id is not None:
        body["tarjeta_id"] = tarjeta_id
    body.update(kw)
    return client.post("/api/tx", json=body)


def _saldo(client, deuda_id):
    deudas = client.get("/api/backup").json()["deudas"]
    return next(d["saldo_actual"] for d in deudas if d["id"] == deuda_id)


def test_gasto_con_tarjeta_sube_el_saldo(client, tarjeta):
    _gasto(client, tarjeta["id"], 500)
    assert _saldo(client, tarjeta["id"]) == 500


def test_editar_monto_reajusta_el_saldo(client, tarjeta):
    tx = _gasto(client, tarjeta["id"], 500).json()
    client.put(
        f"/api/tx/{tx['id']}",
        json={"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 800, "tarjeta_id": tarjeta["id"]},
    )
    assert _saldo(client, tarjeta["id"]) == 800


def test_borrar_gasto_devuelve_el_saldo(client, tarjeta):
    tx = _gasto(client, tarjeta["id"], 500).json()
    client.delete(f"/api/tx/{tx['id']}")
    assert _saldo(client, tarjeta["id"]) == 0


def test_mover_gasto_entre_tarjetas(client, tarjeta):
    otra = client.post(
        "/api/deuda",
        json={"nombre": "Amex", "monto_inicial": 0, "saldo_actual": 0, "clase_deuda": "tarjeta"},
    ).json()
    tx = _gasto(client, tarjeta["id"], 500).json()
    client.put(
        f"/api/tx/{tx['id']}",
        json={"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 500, "tarjeta_id": otra["id"]},
    )
    assert _saldo(client, tarjeta["id"]) == 0
    assert _saldo(client, otra["id"]) == 500


def test_cambiar_gasto_a_ingreso_libera_el_saldo(client, tarjeta):
    tx = _gasto(client, tarjeta["id"], 500).json()
    client.put(
        f"/api/tx/{tx['id']}",
        json={"fecha": "2026-07-01", "tipo": "ingreso", "categoria": "Sueldo", "monto": 500},
    )
    assert _saldo(client, tarjeta["id"]) == 0


def test_gasto_contra_un_prestamo_es_rechazado(client, prestamo):
    assert _gasto(client, prestamo["id"], 500).status_code == 400


def test_borrar_tarjeta_desvincula_sus_transacciones(client, tarjeta):
    tx = _gasto(client, tarjeta["id"], 500).json()
    client.delete(f"/api/deuda/{tarjeta['id']}")
    quedan = client.get("/api/backup").json()["transacciones"]
    assert [t["tarjeta_id"] for t in quedan if t["id"] == tx["id"]] == [None]


def test_tx_huerfana_se_puede_editar_y_borrar(client, tarjeta):
    tx = _gasto(client, tarjeta["id"], 500).json()
    from backend.core import db

    conn = db.get_conn()
    conn.execute("DELETE FROM deudas WHERE id = ?", (tarjeta["id"],))
    conn.commit()
    conn.close()

    edit = client.put(
        f"/api/tx/{tx['id']}",
        json={"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 600, "tarjeta_id": None},
    )
    assert edit.status_code == 200
    assert client.delete(f"/api/tx/{tx['id']}").status_code == 204


def test_tarjeta_id_se_anula_si_no_es_gasto(client, tarjeta):
    base = {"fecha": "2026-05-01", "categoria": "Salario", "monto": 100, "tarjeta_id": tarjeta["id"]}
    ingreso = client.post("/api/tx", json={**base, "tipo": "ingreso"}).json()
    assert ingreso["tarjeta_id"] is None
    saldo = client.get(f"/api/deuda/{tarjeta['id']}").json()["saldo_actual"]
    gasto = client.post("/api/tx", json={**base, "tipo": "gasto"}).json()
    assert gasto["tarjeta_id"] == tarjeta["id"]
    editado = client.put(f"/api/tx/{gasto['id']}", json={**base, "tipo": "ingreso"}).json()
    assert editado["tarjeta_id"] is None
    assert client.get(f"/api/deuda/{tarjeta['id']}").json()["saldo_actual"] == saldo


def test_gasto_fraccionario_en_tarjeta_aplicar_y_deshacer_es_inverso(client):
    tarjeta = client.post(
        "/api/deuda", json={"nombre": "Visa", "saldo_actual": 101, "clase_deuda": "tarjeta", "cupo": 1_000_000}
    ).json()
    tx = _gasto(client, tarjeta["id"], 10.5).json()
    assert tx["monto"] == 11
    assert _saldo(client, tarjeta["id"]) == 112
    client.delete(f"/api/tx/{tx['id']}")
    assert _saldo(client, tarjeta["id"]) == 101


def test_no_se_cambia_el_tipo_de_una_deuda_con_movimientos_ligados(client, tarjeta):
    _gasto(client, tarjeta["id"], 500)
    cuerpo = {"nombre": "Visa", "saldo_actual": 500, "monto_inicial": 500, "clase_deuda": "prestamo"}
    r = client.put(f"/api/deuda/{tarjeta['id']}", json=cuerpo)
    assert r.status_code == 400 and "movimientos ligados" in r.json()["detail"]
    assert client.get(f"/api/deuda/{tarjeta['id']}").json()["es_tarjeta"] is True


def test_se_cambia_el_tipo_de_una_deuda_sin_movimientos(client, tarjeta):
    cuerpo = {"nombre": "Visa", "saldo_actual": 500, "monto_inicial": 500, "clase_deuda": "prestamo"}
    assert client.put(f"/api/deuda/{tarjeta['id']}", json=cuerpo).status_code == 200


def test_gasto_con_tarjeta_inexistente_es_400(client):
    r = _gasto(client, 999, 500)
    assert r.status_code == 400 and r.json()["detail"] == "La tarjeta indicada no existe"
    assert client.get("/api/backup").json()["transacciones"] == []


def test_gasto_con_deuda_que_no_es_tarjeta_es_400(client, prestamo):
    assert _gasto(client, prestamo["id"], 500).status_code == 400


def test_editar_hacia_tarjeta_inexistente_es_400_y_no_toca_el_saldo(client, tarjeta):
    tx = _gasto(client, tarjeta["id"], 500).json()
    cuerpo = {"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 500, "tarjeta_id": 999}
    assert client.put(f"/api/tx/{tx['id']}", json=cuerpo).status_code == 400
    assert _saldo(client, tarjeta["id"]) == 500


def test_borrar_tx_con_tarjeta_huerfana_sigue_funcionando(client, tarjeta):
    tx = _gasto(client, tarjeta["id"], 500).json()
    with conexion() as conn:
        conn.execute("DELETE FROM deudas WHERE id = ?", (tarjeta["id"],))
        conn.commit()
    assert client.delete(f"/api/tx/{tx['id']}").status_code == 204
