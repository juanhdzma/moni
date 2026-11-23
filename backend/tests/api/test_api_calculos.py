import datetime

import pytest

from .builders_api import ACTIVO_DERIVADOS, DEUDA_DERIVADOS, HOY, HOY_ISO, INV_DERIVADOS, REC_DERIVADOS, TX_DERIVADOS, TX_KEYS, sembrar, tx


def test_put_ignora_campos_derivados(client):
    sembrar(client)
    fila = client.get("/api/activos/resumen").json()["items"][0]
    assert ACTIVO_DERIVADOS <= set(fila)
    r = client.put(f"/api/activo/{fila['id']}", json={**fila, "valor_actual": 4_000_000})
    assert r.status_code == 200 and r.json()["valor_actual"] == 4_000_000


def test_dashboard_resumen(client):
    sembrar(client)
    r = client.get("/api/dashboard/resumen").json()
    assert set(r) == {"patrimonio", "proy_delta", "texto_proyeccion", "total_barra", "partes"}
    assert r["texto_proyeccion"] == "proyectados en 12 meses"
    assert r["patrimonio"] == 3_000_000 + 1_500_000 + 3_500_000 - 500_000
    assert [p["id"] for p in r["partes"]] == ["activos", "inversiones", "balance", "deudas"]
    assert r["partes"][1]["detalle"].startswith("+$") and r["partes"][1]["detalle"].endswith("%)")
    assert r["partes"][3]["detalle"] == "$100.000/mes · 1 deuda"


def test_dashboard_evolucion(client):
    sembrar(client)
    r = client.get("/api/dashboard/evolucion").json()
    assert set(r) == {"serie", "periodo", "meses", "puntos", "desde", "hasta", "cambio", "verbo", "sujeto", "mes_desde", "nombre_serie", "frase"}
    assert r["serie"] == "patrimonio" and r["periodo"] == "6M" and r["meses"] == 6 and len(r["puntos"]) == 6
    assert set(r["puntos"][0]) == {"mes", "valor"}
    inv = client.get("/api/dashboard/evolucion", params={"serie": "inversiones", "periodo": "3M"}).json()
    assert inv["sujeto"] == " en inversiones" and inv["meses"] == 3 and inv["hasta"] == 1_500_000


@pytest.mark.parametrize("params", [{"periodo": "2W"}, {"serie": "otra"}])
def test_dashboard_evolucion_rechaza_parametros(client, params):
    assert client.get("/api/dashboard/evolucion", params=params).status_code == 422


def test_dashboard_este_mes(client):
    sembrar(client)
    r = client.get("/api/dashboard/este-mes").json()
    assert set(r) == {"ingresos", "gastos", "quedo", "ahorro_pct", "frase", "descripcion_grafico", "meses"}
    assert (r["ingresos"], r["gastos"], r["quedo"], r["ahorro_pct"]) == (4_000_000, 1_000_000, 3_000_000, 75.0)
    assert len(r["meses"]) == 6 and set(r["meses"][-1]) == {"mes", "entro", "salio"}
    assert r["meses"][-1]["entro"] == 4_000_000 and r["meses"][-1]["salio"] == 1_000_000


def test_dashboard_gastos(client):
    sembrar(client)
    r = client.get("/api/dashboard/gastos", params={"periodo": "1W"}).json()
    assert set(r) == {"periodo", "nombre_periodo", "total", "max", "top", "frase", "categorias"}
    assert r["nombre_periodo"] == "la última semana" and r["total"] == 1_000_000 and r["max"] == 900_000
    assert r["top"] == {"categoria": "Comida", "valor": 900_000, "pct": 90.0}
    assert [c["categoria"] for c in r["categorias"]] == ["Comida", "Transporte"]
    assert set(r["categorias"][0]) == {"categoria", "valor", "n", "detalle", "restantes", "restantes_texto"}
    assert r["categorias"][0]["restantes_texto"] is None
    assert set(r["categorias"][0]["detalle"][0]) == {"id", "fecha", "descripcion", "categoria", "monto"}
    assert r["frase"]["texto"] == "Comida se lleva el 90% de lo que gastaste en la última semana."
    assert client.get("/api/dashboard/gastos").json()["periodo"] == "1M"
    assert client.get("/api/dashboard/gastos", params={"periodo": "9Y"}).status_code == 422


def test_dashboard_gastos_vacio(client):
    r = client.get("/api/dashboard/gastos").json()
    assert r["top"] is None and r["categorias"] == [] and r["total"] == 0 and r["max"] == 0


def test_dashboard_movimientos(client):
    for i in range(7):
        tx(client, descripcion=f"t{i}", fecha=f"2026-01-0{i + 1}")
    r = client.get("/api/dashboard/movimientos").json()
    assert set(r) == {"items"} and len(r["items"]) == 5
    assert set(r["items"][0]) == {"id", "fecha", "tipo", "categoria", "descripcion", "monto", "monto_firmado"}
    assert r["items"][0]["descripcion"] == "t6"
    assert r["items"][0]["monto_firmado"] == -r["items"][0]["monto"]
    assert len(client.get("/api/dashboard/movimientos", params={"n": 2}).json()["items"]) == 2
    assert client.get("/api/dashboard/movimientos", params={"n": 51}).status_code == 422


def test_listar_tx(client):
    tx(client, tipo="ingreso", categoria="Salario", monto=500)
    tx(client, categoria="Comida", monto=200)
    tx(client, tipo="transfer", categoria="Pago deuda", monto=50)
    r = client.get("/api/tx").json()
    assert set(r) == {"items", "filtros", "opciones", "pills", "resumen"}
    assert len(r["items"]) == 2
    assert set(r["items"][0]) == TX_KEYS | TX_DERIVADOS | {"grupo", "tipo_label"}
    assert r["items"][0]["grupo"] == "Hoy"
    assert sorted(t["monto_firmado"] for t in r["items"]) == [-200, 500]
    assert r["filtros"] == {"tipo": "", "mes": "", "cat": ""} and r["pills"] == []
    assert set(r["opciones"]) == {"meses", "categorias", "tipos"}
    assert r["opciones"]["categorias"] == ["Comida", "Pago deuda", "Salario"]
    assert set(r["opciones"]["meses"][0]) == {"value", "label"}
    assert set(r["resumen"]) == {"ingresos", "gastos", "neto", "dato", "segmentos"}
    assert (r["resumen"]["ingresos"], r["resumen"]["gastos"], r["resumen"]["neto"]) == (500, 200, 300)
    assert r["resumen"]["dato"]["texto"] == "entró $500 · salió $200"


def test_listar_tx_filtros_y_orden(client):
    tx(client, tipo="ingreso", categoria="Salario", monto=500)
    tx(client, categoria="Comida", monto=200)
    tx(client, categoria="Comida", monto=300)
    r = client.get("/api/tx", params={"col": "monto", "dir": 1, "tipo": "gasto", "cat": "Comida", "mes": "1999-01"}).json()
    assert [t["monto"] for t in r["items"]] == [200, 300]
    assert r["filtros"] == {"tipo": "gasto", "mes": "", "cat": "Comida"}
    assert r["pills"] == [{"campo": "tipo", "label": "Gastos"}, {"campo": "cat", "label": "Comida"}]
    assert all(t["grupo"] is None for t in r["items"])
    assert client.get("/api/tx", params={"col": "notas"}).status_code == 422
    assert client.get("/api/tx", params={"dir": 2}).status_code == 422


def test_deudas_resumen(client, tarjeta):
    s = sembrar(client)
    saldada = client.post("/api/deuda", json={"nombre": "Saldada", "monto_inicial": 100, "saldo_actual": 100}).json()
    client.post(f"/api/deuda/{saldada['id']}/pago", json={"nuevo_saldo": 0, "total_pagado": 100})
    r = client.get("/api/deudas/resumen").json()
    assert set(r) == {"total", "total_cuotas", "total_intereses", "segmentos", "creditos", "tarjetas", "terminadas", "dato"}
    assert r["total"] == 500_000 and r["total_cuotas"] == 100_000
    assert [d["id"] for d in r["creditos"]] == [s["deuda"]["id"]]
    assert [d["id"] for d in r["tarjetas"]] == [tarjeta["id"]]
    assert [d["nombre"] for d in r["terminadas"]] == ["Saldada"]
    assert r["segmentos"] == [{"key": str(s["deuda"]["id"]), "label": "Credito", "valor": 500_000}]
    assert r["total_intereses"] > 0 and r["dato"]["intereses"].startswith("~")
    assert all("intereses_pagados" not in d for d in r["creditos"])
    assert set(r["creditos"][0]) >= DEUDA_DERIVADOS


def test_inv_resumen(client):
    s = sembrar(client)
    r = client.get("/api/inv/resumen").json()
    assert set(r) == {"total_invertido", "total_actual", "ganancia", "ganancia_pct", "mostrar_ganancia", "texto_ganancia", "segmentos", "fijas", "variables", "texto_posiciones"}
    assert (r["total_invertido"], r["total_actual"], r["ganancia"]) == (1_500_000, 1_500_000, 0)
    assert [i["id"] for i in r["fijas"]] == [s["inv"]["id"]] and [i["id"] for i in r["variables"]] == [s["var"]["id"]]
    assert [x["valor"] for x in r["segmentos"]] == [1_100_000, 400_000]
    assert r["fijas"][0]["desactualizado"] is False and r["variables"][0]["desactualizado"] is True
    assert r["mostrar_ganancia"] is True and r["texto_ganancia"] == "$0 (0,0%) ganado"
    assert r["fijas"][0]["texto_tasa"] == "12,00% EA · 0,9489% MV" and r["variables"][0]["texto_tasa"] is None


def test_activos_resumen(client):
    sembrar(client)
    r = client.get("/api/activos/resumen").json()
    assert set(r) == {"total_inicial", "total_actual", "variacion", "variacion_pct", "segmentos", "items", "texto_variacion", "texto_conteo"}
    assert (r["total_inicial"], r["total_actual"], r["variacion"]) == (3_000_000, 3_500_000, 500_000)
    assert round(r["variacion_pct"], 2) == 16.67
    assert r["segmentos"][0]["label"] == "Casa" and len(r["items"]) == 1


def test_rec_resumen(client):
    sembrar(client)
    client.post("/api/rec", json={"nombre": "Sueldo", "tipo": "ingreso", "monto": 4_000_000, "frecuencia": "mensual", "fecha_inicio": "2026-01-01"})
    client.post("/api/rec", json={"nombre": "Pausada", "tipo": "gasto", "monto": 10, "frecuencia": "mensual", "activo": False})
    r = client.get("/api/rec/resumen").json()
    assert set(r) == {"total_gastos_mensual", "total_ingresos_mensual", "neto_mensual", "dato", "segmentos", "ingresos", "gastos"}
    assert (r["total_gastos_mensual"], r["total_ingresos_mensual"], r["neto_mensual"]) == (800_000, 4_000_000, 3_200_000)
    assert r["dato"]["texto"] == "entran $4.000.000 · salen $800.000 en fijos"
    assert [x["nombre"] for x in r["ingresos"]] == ["Sueldo"]
    assert [x["nombre"] for x in r["gastos"]] == ["Arriendo", "Pausada"]
    assert [x["label"] for x in r["segmentos"]] == ["Arriendo"]
    assert r["gastos"][1]["activo"] is False and r["gastos"][1]["proximo_pago"] is None


def test_dashboard_periodos_ya_no_existe(client):
    assert client.get("/api/dashboard/periodos").status_code == 404


def test_dashboard_frases_usan_el_simbolo_de_moneda(client):
    sembrar(client)
    client.put("/api/ajustes", json={"moneda_simbolo": "COP "})
    r = client.get("/api/dashboard/resumen").json()
    assert r["partes"][3]["detalle"] == "COP100.000/mes · 1 deuda"
    assert "COP" in client.get("/api/dashboard/evolucion").json()["frase"]["texto"]


def test_dashboard_gastos_restantes_texto(client):
    for i in range(8):
        tx(client, categoria="Comida", monto=10 + i)
    cat = client.get("/api/dashboard/gastos", params={"periodo": "1W"}).json()["categorias"][0]
    assert cat["restantes"] == 2 and cat["restantes_texto"] == "y 2 más en Transacciones"
