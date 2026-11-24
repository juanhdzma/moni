import pytest

from .builders_api import sembrar, tx


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
    assert set(r) == {"serie", "periodo", "meses", "puntos", "desde", "cambio", "nombre_serie", "descripcion_grafico", "frase"}
    assert r["serie"] == "patrimonio" and r["periodo"] == "6M" and r["meses"] == 6 and len(r["puntos"]) == 6
    assert set(r["puntos"][0]) == {"mes", "valor"}
    inv = client.get("/api/dashboard/evolucion", params={"serie": "inversiones", "periodo": "3M"}).json()
    assert inv["frase"]["texto"].startswith("Te mantuviste en inversiones") and inv["meses"] == 3 and inv["puntos"][-1]["valor"] == 1_500_000


@pytest.mark.parametrize("params", [{"periodo": "2W"}, {"serie": "otra"}])
def test_dashboard_evolucion_rechaza_parametros(client, params):
    assert client.get("/api/dashboard/evolucion", params=params).status_code == 422


def test_dashboard_este_mes(client):
    sembrar(client)
    r = client.get("/api/dashboard/este-mes").json()
    assert set(r) == {"ingresos", "gastos", "quedo", "frase", "descripcion_grafico", "meses"}
    assert (r["ingresos"], r["gastos"], r["quedo"], r["frase"]["pct"]) == (4_000_000, 1_000_000, 3_000_000, 75.0)
    assert len(r["meses"]) == 6 and set(r["meses"][-1]) == {"mes", "entro", "salio"}
    assert r["meses"][-1]["entro"] == 4_000_000 and r["meses"][-1]["salio"] == 1_000_000


def test_dashboard_gastos(client):
    sembrar(client)
    r = client.get("/api/dashboard/gastos", params={"periodo": "1W"}).json()
    assert set(r) == {"periodo", "total", "max", "top", "frase", "categorias"}
    assert "la última semana" in r["frase"]["texto"] and r["total"] == 1_000_000 and r["max"] == 900_000
    assert r["top"] == {"categoria": "Comida", "valor": 900_000, "pct": 90.0}
    assert [c["categoria"] for c in r["categorias"]] == ["Comida", "Transporte"]
    assert set(r["categorias"][0]) == {"categoria", "valor", "n", "detalle", "restantes_texto"}
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
    assert cat["restantes_texto"] == "y 2 más en Transacciones"
