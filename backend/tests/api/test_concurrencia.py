from concurrent.futures import ThreadPoolExecutor

HILOS = 4
PETICIONES = 24


def _en_paralelo(accion):
    with ThreadPoolExecutor(max_workers=HILOS) as pool:
        return list(pool.map(accion, range(PETICIONES)))


def _saldo(client, deuda_id):
    return client.get(f"/api/deuda/{deuda_id}").json()["saldo_actual"]


def test_gastos_simultaneos_sobre_la_misma_tarjeta_no_pierden_saldo(client, tarjeta):
    cuerpo = {"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 1000, "tarjeta_id": tarjeta["id"]}
    respuestas = _en_paralelo(lambda _: client.post("/api/tx", json=cuerpo))
    assert [r.status_code for r in respuestas] == [200] * PETICIONES
    assert _saldo(client, tarjeta["id"]) == PETICIONES * 1000
    assert len({r.json()["id"] for r in respuestas}) == PETICIONES


def test_borrados_simultaneos_devuelven_cada_saldo_una_sola_vez(client, tarjeta):
    cuerpo = {"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 1000, "tarjeta_id": tarjeta["id"]}
    ids = [client.post("/api/tx", json=cuerpo).json()["id"] for _ in range(PETICIONES)]
    codigos = _en_paralelo(lambda n: client.delete(f"/api/tx/{ids[n]}").status_code)
    assert codigos == [204] * PETICIONES
    assert _saldo(client, tarjeta["id"]) == 0


def test_pagos_simultaneos_acumulan_intereses_sin_perder_ninguno(client, prestamo):
    def pagar(_):
        return client.post(
            f"/api/deuda/{prestamo['id']}/pago",
            json={"modo": "abono", "nuevo_saldo": 900_000, "total_pagado": 100_000, "intereses": 1_000,
                  "fecha": "2026-07-01", "descripcion": "Abono", "registrar_tx": False},
        ).status_code

    assert _en_paralelo(pagar) == [200] * PETICIONES
    deuda = next(d for d in client.get("/api/backup").json()["deudas"] if d["id"] == prestamo["id"])
    assert deuda["total_intereses"] == PETICIONES * 1_000


def test_aportes_simultaneos_suman_todos(client):
    inicial = 1000
    inv = client.post("/api/inv", json={"nombre": "Fondo", "tipo": "variable", "monto_invertido": inicial, "valor_actual": inicial}).json()
    codigos = _en_paralelo(
        lambda _: client.post(f"/api/inv/{inv['id']}/aporte", json={"monto": 100, "fecha": "2026-07-01", "registrar_tx": False}).status_code
    )
    assert codigos == [200] * PETICIONES
    fila = next(i for i in client.get("/api/backup").json()["inversiones"] if i["id"] == inv["id"])
    assert fila["monto_invertido"] == fila["valor_actual"] == inicial + PETICIONES * 100


def test_put_simultaneos_sobre_la_misma_tx_con_tarjeta_deshacen_el_efecto_una_sola_vez(client, tarjeta):
    cuerpo = {"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 1000, "tarjeta_id": tarjeta["id"]}
    tx_id = client.post("/api/tx", json=cuerpo).json()["id"]
    codigos = _en_paralelo(lambda _: client.put(f"/api/tx/{tx_id}", json={**cuerpo, "monto": 2000}).status_code)
    assert codigos == [200] * PETICIONES
    assert _saldo(client, tarjeta["id"]) == 2000


def test_delete_simultaneo_de_la_misma_tx_devuelve_el_saldo_una_sola_vez(client, tarjeta):
    cuerpo = {"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 1000, "tarjeta_id": tarjeta["id"]}
    client.post("/api/tx", json={**cuerpo, "monto": 500})
    tx_id = client.post("/api/tx", json=cuerpo).json()["id"]
    codigos = _en_paralelo(lambda _: client.delete(f"/api/tx/{tx_id}").status_code)
    assert sorted(codigos) == [204] + [404] * (PETICIONES - 1)
    assert _saldo(client, tarjeta["id"]) == 500
