"""Gastos con tarjeta: el saldo de la deuda tiene que seguir a las transacciones."""


def _gasto(client, tarjeta_id, monto, **kw):
    body = {"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": monto}
    if tarjeta_id is not None:
        body["tarjeta_id"] = tarjeta_id
    body.update(kw)
    return client.post("/api/tx", json=body)


def _saldo(client, deuda_id):
    deudas = client.get("/api/all").json()["deudas"]
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
        json={"nombre": "Amex", "monto_inicial": 0, "saldo_actual": 0, "es_tarjeta": True},
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


# ── Regresión: borrar la tarjeta dejaba las tx inmortales ────────────────────
def test_borrar_tarjeta_desvincula_sus_transacciones(client, tarjeta):
    tx = _gasto(client, tarjeta["id"], 500).json()
    client.delete(f"/api/deuda/{tarjeta['id']}")
    quedan = client.get("/api/all").json()["transacciones"]
    assert [t["tarjeta_id"] for t in quedan if t["id"] == tx["id"]] == [None]


def test_tx_huerfana_se_puede_editar_y_borrar(client, tarjeta):
    """Antes: el 400 de _ajustar_saldo_tarjeta las hacía ineditables e inborrables."""
    tx = _gasto(client, tarjeta["id"], 500).json()
    # Se simula la huérfana saltándose el cleanup del DELETE (datos viejos ya rotos).
    from backend import db

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
