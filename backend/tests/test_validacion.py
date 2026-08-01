"""Basura que antes entraba a la base con un 200."""

import pytest

TX_OK = {"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 100}


@pytest.mark.parametrize(
    "patch",
    [
        {"tipo": "banana"},
        {"monto": -999},
        {"monto": 0},
        {"fecha": "nope"},
        {"fecha": "01/07/2026"},
        {"fecha": ""},
        {"categoria": ""},
    ],
    ids=["tipo-invalido", "monto-negativo", "monto-cero", "fecha-basura", "fecha-no-iso", "fecha-vacia", "sin-categoria"],
)
def test_tx_invalida_es_rechazada(client, patch):
    assert client.post("/api/tx", json={**TX_OK, **patch}).status_code == 422


@pytest.mark.parametrize("fecha", ["2026-07-01", "2026-07-01T14:30"])
def test_formatos_de_fecha_validos(client, fecha):
    assert client.post("/api/tx", json={**TX_OK, "fecha": fecha}).status_code == 200


def test_inversion_con_tipo_invalido(client):
    r = client.post(
        "/api/inv",
        json={"nombre": "X", "tipo": "cripto", "monto_invertido": 100, "valor_actual": 100},
    )
    assert r.status_code == 422


def test_recurrente_con_frecuencia_invalida(client):
    r = client.post(
        "/api/rec",
        json={"nombre": "Netflix", "tipo": "gasto", "monto": 100, "frecuencia": "cada_luna_llena"},
    )
    assert r.status_code == 422


def test_dia_pago_fuera_de_rango(client):
    r = client.post(
        "/api/inv",
        json={"nombre": "CDT", "tipo": "fija", "monto_invertido": 100, "valor_actual": 100,
              "pago": "mensual", "dia_pago": 45},
    )
    assert r.status_code == 422


# ── Invariantes de las composite actions ─────────────────────────────────────
def test_pago_no_puede_subir_el_saldo(client, prestamo):
    r = client.post(
        f"/api/deuda/{prestamo['id']}/pago",
        json={"nuevo_saldo": 2_000_000, "total_pagado": 100_000, "fecha": "2026-07-01", "descripcion": "x"},
    )
    assert r.status_code == 400


def test_adelanto_no_puede_bajar_el_saldo(client, tarjeta):
    client.post("/api/tx", json={**TX_OK, "monto": 500, "tarjeta_id": tarjeta["id"]})
    r = client.post(
        f"/api/deuda/{tarjeta['id']}/adelanto",
        json={"monto": 100, "nuevo_saldo": 0, "fecha": "2026-07-01", "descripcion": "x"},
    )
    assert r.status_code == 400


def test_adelanto_solo_para_tarjetas(client, prestamo):
    r = client.post(
        f"/api/deuda/{prestamo['id']}/adelanto",
        json={"monto": 100, "nuevo_saldo": 1_100_000, "fecha": "2026-07-01", "descripcion": "x"},
    )
    assert r.status_code == 400


def test_retiro_parcial_no_puede_dejar_mas_de_lo_que_habia(client):
    inv = client.post(
        "/api/inv",
        json={"nombre": "Fondo", "tipo": "variable", "monto_invertido": 1000, "valor_actual": 1000},
    ).json()
    r = client.post(
        f"/api/inv/{inv['id']}/retiro",
        json={"tipo": "parcial", "monto": 100, "saldo_queda": 5000, "fecha": "2026-07-01"},
    )
    assert r.status_code == 400


def test_404_en_entidad_inexistente(client):
    assert client.delete("/api/deuda/9999").status_code == 404
    assert client.post(
        "/api/inv/9999/rendimiento", json={"monto": 100, "fecha": "2026-07-01"}
    ).status_code == 404
