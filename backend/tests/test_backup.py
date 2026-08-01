"""Export/import/truncate y el header anti-CSRF."""

from backend import main

TX_OK = {"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 100}


def test_roundtrip_export_import(client, tarjeta):
    client.post("/api/tx", json={**TX_OK, "tarjeta_id": tarjeta["id"]})
    client.post("/api/rec", json={"nombre": "Netflix", "tipo": "gasto", "monto": 40, "frecuencia": "mensual"})
    antes = client.get("/api/all").json()

    client.post("/api/truncate")
    assert client.get("/api/all").json()["transacciones"] == []

    counts = client.post("/api/import", json=antes).json()
    assert counts["transacciones"] == 1
    assert client.get("/api/all").json() == antes


def test_import_rechaza_filas_corruptas(client):
    r = client.post("/api/import", json={"transacciones": [{**TX_OK, "monto": "mucha plata"}]})
    assert r.status_code == 400
    assert "transacciones[0]" in r.json()["detail"]


def test_import_corrupto_no_deja_nada_a_medias(client):
    payload = {"transacciones": [TX_OK, {**TX_OK, "tipo": "banana"}]}
    assert client.post("/api/import", json=payload).status_code == 400
    assert client.get("/api/all").json()["transacciones"] == []


def test_truncate_reinicia_los_ids(client):
    client.post("/api/tx", json=TX_OK)
    client.post("/api/truncate")
    assert client.post("/api/tx", json=TX_OK).json()["id"] == 1


# ── Anti-CSRF ────────────────────────────────────────────────────────────────
def test_mutacion_sin_header_es_rechazada(client):
    """El caso que importa: un <form> cross-origin contra /api/truncate."""
    del client.headers[main.CSRF_HEADER]
    assert client.post("/api/truncate").status_code == 403
    assert client.post("/api/tx", json=TX_OK).status_code == 403
    assert client.delete("/api/deuda/1").status_code == 403


def test_lectura_no_necesita_header(client):
    del client.headers[main.CSRF_HEADER]
    assert client.get("/api/all").status_code == 200
