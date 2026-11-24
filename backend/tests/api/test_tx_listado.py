from backend.core import db

from .builders_api import TX_DERIVADOS, TX_KEYS, tx


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


def test_listado_tolera_tx_con_fecha_vacia_legacy(client):
    client.post("/api/tx", json={"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 100})
    conn = db.get_conn()
    conn.execute("INSERT INTO transacciones (fecha, tipo, categoria, descripcion, monto, notas) VALUES ('', 'gasto', 'Mercado', '', 50, '')")
    conn.commit()
    conn.close()
    r = client.get("/api/tx")
    assert r.status_code == 200
    assert len(r.json()["items"]) == 2
    assert [m["value"] for m in r.json()["opciones"]["meses"]] == ["2026-07"]
