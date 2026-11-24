from .builders_api import ACTIVO_DERIVADOS, DEUDA_DERIVADOS, sembrar


def test_put_ignora_campos_derivados(client):
    sembrar(client)
    fila = client.get("/api/activos/resumen").json()["items"][0]
    assert ACTIVO_DERIVADOS <= set(fila)
    r = client.put(f"/api/activo/{fila['id']}", json={**fila, "valor_actual": 4_000_000})
    assert r.status_code == 200 and r.json()["valor_actual"] == 4_000_000


def test_deudas_resumen(client, tarjeta):
    s = sembrar(client)
    saldada = client.post("/api/deuda", json={"nombre": "Saldada", "monto_inicial": 100, "saldo_actual": 100}).json()
    client.post(f"/api/deuda/{saldada['id']}/pago", json={"nuevo_saldo": 0, "total_pagado": 100})
    r = client.get("/api/deudas/resumen").json()
    assert set(r) == {"total", "total_intereses", "segmentos", "creditos", "tarjetas", "terminadas", "dato", "texto_vacio_creditos"}
    assert r["total"] == 500_000
    assert [d["id"] for d in r["creditos"]] == [s["deuda"]["id"]]
    assert [d["id"] for d in r["tarjetas"]] == [tarjeta["id"]]
    assert [d["nombre"] for d in r["terminadas"]] == ["Saldada"]
    assert r["segmentos"] == [{"key": str(s["deuda"]["id"]), "label": "Credito", "valor": 500_000}]
    assert r["total_intereses"] > 0 and r["dato"]["intereses"].startswith("~")
    assert all("intereses_pagados" not in d for d in r["creditos"])
    assert set(r["creditos"][0]) >= DEUDA_DERIVADOS - {"meses_restantes"} | {"tiene_cupo"}
    assert "meses_restantes" not in r["creditos"][0]


def test_inv_resumen(client):
    s = sembrar(client)
    r = client.get("/api/inv/resumen").json()
    assert set(r) == {"total_actual", "ganancia", "ganancia_pct", "mostrar_ganancia", "texto_ganancia", "segmentos", "fijas", "variables", "texto_posiciones"}
    assert (r["total_actual"], r["ganancia"]) == (1_500_000, 0)
    assert [i["id"] for i in r["fijas"]] == [s["inv"]["id"]] and [i["id"] for i in r["variables"]] == [s["var"]["id"]]
    assert [x["valor"] for x in r["segmentos"]] == [1_100_000, 400_000]
    assert r["fijas"][0]["desactualizado"] is False and r["variables"][0]["desactualizado"] is True
    assert r["mostrar_ganancia"] is True and r["texto_ganancia"] == "$0 (0,0%) ganado"
    assert r["fijas"][0]["texto_tasa"] == "12,00% EA · 0,9489% MV" and r["variables"][0]["texto_tasa"] is None


def test_activos_resumen(client):
    sembrar(client)
    r = client.get("/api/activos/resumen").json()
    assert set(r) == {"total_inicial", "total_actual", "variacion", "mostrar_variacion", "segmentos", "items", "texto_variacion", "texto_conteo"}
    assert (r["total_inicial"], r["total_actual"], r["variacion"]) == (3_000_000, 3_500_000, 500_000)
    assert r["mostrar_variacion"] is True and r["texto_variacion"] == "16,7% sobre lo pagado"
    assert r["segmentos"][0]["label"] == "Casa" and len(r["items"]) == 1


def test_rec_resumen(client):
    sembrar(client)
    client.post("/api/rec", json={"nombre": "Sueldo", "tipo": "ingreso", "monto": 4_000_000, "frecuencia": "mensual", "fecha_inicio": "2026-01-01"})
    client.post("/api/rec", json={"nombre": "Pausada", "tipo": "gasto", "monto": 10, "frecuencia": "mensual", "activo": False})
    r = client.get("/api/rec/resumen").json()
    assert set(r) == {"neto_mensual", "dato", "segmentos", "ingresos", "gastos"}
    assert r["neto_mensual"] == 3_200_000
    assert r["dato"]["texto"] == "entran $4.000.000 · salen $800.000 en fijos"
    assert [x["nombre"] for x in r["ingresos"]] == ["Sueldo"]
    assert [x["nombre"] for x in r["gastos"]] == ["Arriendo", "Pausada"]
    assert [x["label"] for x in r["segmentos"]] == ["Arriendo"]
    assert r["gastos"][1]["activo"] is False and r["gastos"][1]["proximo_pago"] is None
