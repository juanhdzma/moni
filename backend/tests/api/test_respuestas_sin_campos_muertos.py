from .builders_api import sembrar

NO_LEIDOS_DEUDA = {"es_tarjeta", "activa", "vigente"}


def test_deuda_sale_sin_es_tarjeta_activa_ni_vigente(client):
    s = sembrar(client)
    filas = [client.get(f"/api/deuda/{s['deuda']['id']}").json(), *client.get("/api/deudas/resumen").json()["creditos"]]
    assert all(not NO_LEIDOS_DEUDA & set(f) for f in filas)
    assert "es_tarjeta" not in client.post("/api/deuda", json={"nombre": "P", "saldo_actual": 5}).json()


def test_inversion_y_activo_salen_sin_valor_actualizado_en(client):
    s = sembrar(client)
    inv_id, activo_id = s["inv"]["id"], s["activo"]["id"]
    filas = [
        client.get(f"/api/inv/{inv_id}").json(),
        client.get(f"/api/activo/{activo_id}").json(),
        client.post(f"/api/inv/{inv_id}/valor", json={"nuevo_valor": 5}).json(),
        client.post(f"/api/activo/{activo_id}/valor", json={"nuevo_valor": 5}).json(),
        *client.get("/api/inv/resumen").json()["fijas"],
        *client.get("/api/activos/resumen").json()["items"],
    ]
    assert all("valor_actualizado_en" not in f for f in filas)
    assert "valor_actualizado_en" in client.get("/api/backup").json()["inversiones"][0]


def test_proximas_no_trae_hoy(client):
    assert "hoy" not in client.get("/api/proximas-operaciones").json()


def test_frase_del_mes_sin_ingresos_no_trae_pct(client):
    frase = client.get("/api/dashboard/este-mes").json()["frase"]
    assert frase["tipo"] == "sin_ingresos" and "pct" not in frase
