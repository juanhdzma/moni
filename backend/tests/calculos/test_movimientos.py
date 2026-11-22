import pytest

from backend.calculos.operaciones.movimientos import (
    ErrorDeDominio,
    proxima_cuota_tras_pago,
    retiro_parcial,
    sumar_un_mes,
    validar_adelanto,
    validar_pago,
    valor_estimado_tras_aporte,
)


def test_retiro_parcial_prorratea_invertido():
    r = retiro_parcial(1000, 800, 250, 750)
    assert (r.valor_actual, r.monto_invertido) == (750.0, 600.0)


def test_retiro_parcial_redondeo_en_borde_medio_peso():
    assert retiro_parcial(1000, 5, 500, 500).monto_invertido == 2.0
    assert retiro_parcial(1000, 7, 500, 500).monto_invertido == 4.0


def test_retiro_parcial_valor_cero_no_divide():
    r = retiro_parcial(0, 100, 10, 0)
    assert (r.valor_actual, r.monto_invertido) == (0.0, 100.0)


def test_retiro_mayor_al_valor_no_deja_invertido_negativo():
    assert retiro_parcial(100, 50, 200, 0).monto_invertido == 0.0


def test_retiro_parcial_sin_saldo_queda():
    with pytest.raises(ErrorDeDominio) as e:
        retiro_parcial(1000, 800, 250, None)
    assert e.value.mensaje == "saldo_queda requerido para retiro parcial"
    assert e.value.status == 400


def test_retiro_parcial_saldo_queda_supera_valor():
    with pytest.raises(ErrorDeDominio, match="no puede superar el valor actual"):
        retiro_parcial(1000, 800, 250, 1001)


def test_valor_estimado_tras_aporte():
    assert valor_estimado_tras_aporte(1000, 250.5) == 1250.5


def test_validar_pago():
    validar_pago(100, 100)
    validar_pago(100, 0)
    with pytest.raises(ErrorDeDominio, match="no puede superar el saldo actual"):
        validar_pago(100, 101)


def test_validar_adelanto():
    validar_adelanto(True, 100, 100)
    validar_adelanto(True, 100, 150)
    with pytest.raises(ErrorDeDominio, match="Solo las tarjetas"):
        validar_adelanto(False, 100, 150)
    with pytest.raises(ErrorDeDominio, match="no puede ser menor"):
        validar_adelanto(True, 100, 99)


def test_sumar_un_mes_recorta_fin_de_mes():
    assert sumar_un_mes("2025-01-31") == "2025-02-28"
    assert sumar_un_mes("2024-01-31") == "2024-02-29"
    assert sumar_un_mes("2025-12-15") == "2026-01-15"
    assert sumar_un_mes("2025-03-10T08:30") == "2025-04-10"


def test_proxima_cuota_tras_pago():
    assert proxima_cuota_tras_pago(True, "2025-01-31", 50, True) is None
    assert proxima_cuota_tras_pago(False, None, 50, True) is None
    assert proxima_cuota_tras_pago(False, "", 50, True) is None
    assert proxima_cuota_tras_pago(False, "2025-01-31", 0, True) == ""
    assert proxima_cuota_tras_pago(False, "2025-01-31", 0, False) == ""
    assert proxima_cuota_tras_pago(False, "2025-01-31", 50, True) == "2025-02-28"
    assert proxima_cuota_tras_pago(False, "2025-01-31", 50, False) is None
