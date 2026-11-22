import datetime

import pytest

from backend.calculos.fechas import hoy_bogota

HOY = hoy_bogota()
HOY_ISO = HOY.isoformat()
MES = HOY_ISO[:7]

TX_KEYS = {"id", "fecha", "tipo", "categoria", "descripcion", "monto", "notas", "tarjeta_id"}
TX_DERIVADOS = {"mes", "es_gasto_cartera", "tarjeta_nombre", "tarjeta_franquicia", "metodo_pago"}
DEUDA_DERIVADOS = {
    "activa", "vigente", "progreso_pct", "capital_pagado", "meses_restantes", "nivel_progreso",
    "intereses_pagados", "disponible", "uso_pct", "nivel_uso",
}
INV_DERIVADOS = {"ganancia", "ganancia_pct", "tasa_mv", "proximo_pago", "rendimiento_esperado", "desactualizada"}
ACTIVO_DERIVADOS = {"cambio", "cambio_pct", "desactualizado"}
REC_DERIVADOS = {"frecuencia_label", "mensual", "proximo_pago"}


def tx(client, **kw):
    body = {"fecha": HOY_ISO, "tipo": "gasto", "categoria": "Comida", "descripcion": "x", "monto": 1000, **kw}
    r = client.post("/api/tx", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def sembrar(client):
    tx(client, tipo="ingreso", categoria="Salario", monto=4_000_000)
    tx(client, monto=900_000, categoria="Comida")
    tx(client, monto=100_000, categoria="Transporte")
    deuda = client.post("/api/deuda", json={
        "nombre": "Credito", "monto_inicial": 1_000_000, "saldo_actual": 500_000, "tasa_ea": 24,
        "cuota_mensual": 100_000, "proxima_cuota": (HOY + datetime.timedelta(days=3)).isoformat(),
    }).json()
    inv = client.post("/api/inv", json={
        "nombre": "CDT", "tipo": "fija", "monto_invertido": 1_000_000, "valor_actual": 1_100_000,
        "tasa_ea": 12, "pago": "mensual", "dia_pago": 15,
    }).json()
    var = client.post("/api/inv", json={
        "nombre": "Acciones", "tipo": "variable", "monto_invertido": 500_000, "valor_actual": 400_000,
        "valor_actualizado_en": "2020-01-01",
    }).json()
    activo = client.post("/api/activo", json={"nombre": "Casa", "valor_inicial": 3_000_000, "valor_actual": 3_500_000}).json()
    rec = client.post("/api/rec", json={
        "nombre": "Arriendo", "tipo": "gasto", "monto": 800_000, "frecuencia": "mensual", "fecha_inicio": "2026-01-05",
    }).json()
    return {"deuda": deuda, "inv": inv, "var": var, "activo": activo, "rec": rec}


def test_all_gana_campos_derivados_sin_perder_los_crudos(client):
    s = sembrar(client)
    body = client.get("/api/all").json()
    assert set(body) == {
        "transacciones", "deudas", "inversiones", "activos", "recurrentes",
        "hoy", "mes_actual", "ajustes", "categorias", "alertas", "conteos",
    }
    assert body["hoy"] == HOY_ISO and body["mes_actual"] == MES
    assert body["ajustes"] == {"moneda_simbolo": "$"}
    assert body["alertas"] == {"activos": False, "inversiones": True}
    assert body["conteos"] == {"activos": 1, "inversiones": 2}
    assert set(body["transacciones"][0]) == TX_KEYS | TX_DERIVADOS
    assert set(body["deudas"][0]) >= set(s["deuda"]) | DEUDA_DERIVADOS
    assert set(body["inversiones"][0]) >= set(s["inv"]) | INV_DERIVADOS
    assert set(body["activos"][0]) >= set(s["activo"]) | ACTIVO_DERIVADOS
    assert set(body["recurrentes"][0]) >= set(s["rec"]) | REC_DERIVADOS
    assert body["recurrentes"][0]["activo"] is True
    assert body["categorias"]["ingreso"][0] == {"nombre": "Crédito recibido", "sistema": True}


def test_put_ignora_campos_derivados(client):
    sembrar(client)
    fila = client.get("/api/all").json()["activos"][0]
    r = client.put(f"/api/activo/{fila['id']}", json={**fila, "valor_actual": 4_000_000})
    assert r.status_code == 200 and r.json()["valor_actual"] == 4_000_000


def test_backup_roundtrip_con_all_derivado(client):
    sembrar(client)
    exportado = client.get("/api/all").json()
    client.post("/api/truncate")
    r = client.post("/api/import", json={k: exportado[k] for k in ("transacciones", "deudas", "inversiones", "activos", "recurrentes")})
    assert r.status_code == 200, r.text


def test_dashboard_resumen(client):
    sembrar(client)
    r = client.get("/api/dashboard/resumen").json()
    assert set(r) == {
        "patrimonio", "efectivo", "total_deuda", "total_inv", "total_activos", "ingresos_mes", "gastos_mes",
        "quedo_mes", "ahorro_pct", "proy_delta", "cuota_total", "deudas_activas", "total_invertido",
        "ganancia_inv", "ganancia_inv_pct", "total_barra", "frase_mes", "partes",
    }
    assert r["ingresos_mes"] == 4_000_000 and r["gastos_mes"] == 1_000_000
    assert r["efectivo"] == 3_000_000 and r["total_deuda"] == 500_000
    assert r["patrimonio"] == 3_000_000 + 1_500_000 + 3_500_000 - 500_000
    assert r["frase_mes"] == {"tipo": "quedo", "pct": 75.0}
    assert [p["id"] for p in r["partes"]] == ["activos", "inversiones", "balance", "deudas"]
    assert r["partes"][1]["detalle"] is None and set(r["partes"][1]["detalle_datos"]) == {"ganancia", "ganancia_pct"}
    assert r["partes"][3]["detalle_datos"] == {"cuota_total": 100_000, "n": "1 deuda"}


def test_dashboard_evolucion(client):
    sembrar(client)
    r = client.get("/api/dashboard/evolucion").json()
    assert set(r) == {"serie", "periodo", "meses", "puntos", "desde", "hasta", "cambio", "verbo", "sujeto", "mes_desde"}
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
    assert set(r) == {"ingresos", "gastos", "quedo", "ahorro_pct", "frase", "meses"}
    assert (r["ingresos"], r["gastos"], r["quedo"], r["ahorro_pct"]) == (4_000_000, 1_000_000, 3_000_000, 75.0)
    assert len(r["meses"]) == 6 and set(r["meses"][-1]) == {"mes", "entro", "salio"}
    assert r["meses"][-1]["entro"] == 4_000_000 and r["meses"][-1]["salio"] == 1_000_000


def test_dashboard_gastos(client):
    sembrar(client)
    r = client.get("/api/dashboard/gastos", params={"periodo": "1W"}).json()
    assert set(r) == {"periodo", "nombre_periodo", "total", "max", "top", "categorias"}
    assert r["nombre_periodo"] == "la última semana" and r["total"] == 1_000_000 and r["max"] == 900_000
    assert r["top"] == {"categoria": "Comida", "valor": 900_000, "pct": 90.0}
    assert [c["categoria"] for c in r["categorias"]] == ["Comida", "Transporte"]
    assert set(r["categorias"][0]) == {"categoria", "valor", "n", "detalle", "restantes"}
    assert set(r["categorias"][0]["detalle"][0]) == {"id", "fecha", "descripcion", "categoria", "monto"}
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
    assert set(r["items"][0]) == {"id", "fecha", "tipo", "categoria", "descripcion", "monto"}
    assert r["items"][0]["descripcion"] == "t6"
    assert len(client.get("/api/dashboard/movimientos", params={"n": 2}).json()["items"]) == 2
    assert client.get("/api/dashboard/movimientos", params={"n": 51}).status_code == 422


def test_listar_tx(client):
    tx(client, tipo="ingreso", categoria="Salario", monto=500)
    tx(client, categoria="Comida", monto=200)
    tx(client, tipo="transfer", categoria="Pago deuda", monto=50)
    r = client.get("/api/tx").json()
    assert set(r) == {"items", "filtros", "opciones", "pills", "resumen"}
    assert len(r["items"]) == 2
    assert set(r["items"][0]) == TX_KEYS | TX_DERIVADOS | {"grupo"}
    assert r["items"][0]["grupo"] == "Hoy"
    assert r["filtros"] == {"tipo": "", "mes": "", "cat": ""} and r["pills"] == []
    assert set(r["opciones"]) == {"meses", "categorias"}
    assert r["opciones"]["categorias"] == ["Comida", "Pago deuda", "Salario"]
    assert set(r["opciones"]["meses"][0]) == {"value", "label"}
    assert set(r["resumen"]) == {"ingresos", "gastos", "neto", "segmentos"}
    assert (r["resumen"]["ingresos"], r["resumen"]["gastos"], r["resumen"]["neto"]) == (500, 200, 300)


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
    client.post("/api/deuda", json={"nombre": "Saldada", "monto_inicial": 100, "saldo_actual": 0})
    r = client.get("/api/deudas/resumen").json()
    assert set(r) == {"total", "total_cuotas", "total_intereses", "intereses_aproximado", "segmentos", "creditos", "tarjetas", "terminadas"}
    assert r["total"] == 500_000 and r["total_cuotas"] == 100_000
    assert [d["id"] for d in r["creditos"]] == [s["deuda"]["id"]]
    assert [d["id"] for d in r["tarjetas"]] == [tarjeta["id"]]
    assert [d["nombre"] for d in r["terminadas"]] == ["Saldada"]
    assert r["segmentos"] == [{"key": str(s["deuda"]["id"]), "label": "Credito", "valor": 500_000}]
    assert r["intereses_aproximado"] is True and r["total_intereses"] > 0
    assert set(r["creditos"][0]) >= DEUDA_DERIVADOS


def test_inv_resumen(client):
    s = sembrar(client)
    r = client.get("/api/inv/resumen").json()
    assert set(r) == {"total_invertido", "total_actual", "ganancia", "ganancia_pct", "segmentos", "fijas", "variables"}
    assert (r["total_invertido"], r["total_actual"], r["ganancia"]) == (1_500_000, 1_500_000, 0)
    assert [i["id"] for i in r["fijas"]] == [s["inv"]["id"]] and [i["id"] for i in r["variables"]] == [s["var"]["id"]]
    assert [x["valor"] for x in r["segmentos"]] == [1_100_000, 400_000]
    assert r["fijas"][0]["desactualizada"] is False and r["variables"][0]["desactualizada"] is True


def test_activos_resumen(client):
    sembrar(client)
    r = client.get("/api/activos/resumen").json()
    assert set(r) == {"total_inicial", "total_actual", "variacion", "variacion_pct", "segmentos", "items"}
    assert (r["total_inicial"], r["total_actual"], r["variacion"]) == (3_000_000, 3_500_000, 500_000)
    assert round(r["variacion_pct"], 2) == 16.67
    assert r["segmentos"][0]["label"] == "Casa" and len(r["items"]) == 1


def test_rec_resumen(client):
    sembrar(client)
    client.post("/api/rec", json={"nombre": "Sueldo", "tipo": "ingreso", "monto": 4_000_000, "frecuencia": "mensual", "fecha_inicio": "2026-01-01"})
    client.post("/api/rec", json={"nombre": "Pausada", "tipo": "gasto", "monto": 10, "frecuencia": "mensual", "activo": False})
    r = client.get("/api/rec/resumen").json()
    assert set(r) == {"total_gastos_mensual", "total_ingresos_mensual", "neto_mensual", "segmentos", "ingresos", "gastos"}
    assert (r["total_gastos_mensual"], r["total_ingresos_mensual"], r["neto_mensual"]) == (800_000, 4_000_000, 3_200_000)
    assert [x["nombre"] for x in r["ingresos"]] == ["Sueldo"]
    assert [x["nombre"] for x in r["gastos"]] == ["Arriendo", "Pausada"]
    assert [x["label"] for x in r["segmentos"]] == ["Arriendo"]
    assert r["gastos"][1]["activo"] is False and r["gastos"][1]["proximo_pago"] is None


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
