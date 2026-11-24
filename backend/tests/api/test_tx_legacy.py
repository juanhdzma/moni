from backend.core import db


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
