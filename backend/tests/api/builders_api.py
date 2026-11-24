import datetime

from backend.calculos.fechas import hoy_bogota

HOY = hoy_bogota()
HOY_ISO = HOY.isoformat()
MES = HOY_ISO[:7]

TX_KEYS = {"id", "fecha", "tipo", "categoria", "descripcion", "monto", "notas", "tarjeta_id"}
TX_DERIVADOS = {"monto_firmado", "tarjeta_nombre", "tarjeta_franquicia", "metodo_pago"}
DEUDA_DERIVADOS = {
    "activa", "vigente", "progreso_pct", "capital_pagado", "nivel_progreso",
    "disponible", "uso_pct", "nivel_uso",
}
INV_DERIVADOS = {"ganancia", "ganancia_pct", "proximo_pago", "rendimiento_esperado", "desactualizado", "texto_tasa", "capitaliza_default"}
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
