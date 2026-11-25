import pytest

from backend.calculos.errores import ErrorDeDominio
from backend.calculos.operaciones.movimientos import (
    CambioInversion,
    alternar_activo,
    aplicar_aporte,
    aplicar_rendimiento,
    aplicar_retiro,
    aplicar_valor,
)


def _mensaje(fn, *args, **kw):
    with pytest.raises(ErrorDeDominio) as e:
        fn(*args, **kw)
    return e.value.mensaje, e.value.status


INV = {"nombre": "CDT", "valor_actual": 1000.0, "monto_invertido": 800.0}


def test_aplicar_valor_y_cambio_de_inversion_por_defecto():
    assert aplicar_valor(1234, "2026-03-03") == {"valor_actual": 1234, "valor_actualizado_en": "2026-03-03"}
    assert CambioInversion({}) == CambioInversion({}, None, False)


def test_aplicar_rendimiento_capitaliza_sin_tx():
    c = aplicar_rendimiento(INV, 50, "2026-03-03", "n", True, True)
    assert c == CambioInversion({"valor_actual": 1050.0, "valor_actualizado_en": "2026-03-03"}, None, False)


def test_aplicar_rendimiento_pagado_registra_tx_solo_si_se_pide():
    c = aplicar_rendimiento(INV, 50, "2026-03-03", "n", False, True)
    assert c.cambios == {} and c.borrar is False
    assert c.tx == {
        "fecha": "2026-03-03", "tipo": "ingreso", "categoria": "Intereses",
        "descripcion": "Rendimiento · CDT", "monto": 50, "notas": "n",
    }
    assert aplicar_rendimiento(INV, 50, "2026-03-03", "n", False, False) == CambioInversion({}, None, False)


def test_aplicar_aporte_con_y_sin_nuevo_valor():
    c = aplicar_aporte(INV, 200, None, "2026-03-03", "n", True)
    assert c.cambios == {"monto_invertido": 1000.0, "valor_actual": 1200.0, "valor_actualizado_en": "2026-03-03"}
    assert c.tx == {
        "fecha": "2026-03-03", "tipo": "gasto", "categoria": "Inversión",
        "descripcion": "Aporte · CDT", "monto": 200, "notas": "n",
    }
    c = aplicar_aporte(INV, 200, 1500, "2026-03-03", "", False)
    assert c == CambioInversion({"monto_invertido": 1000.0, "valor_actual": 1500, "valor_actualizado_en": "2026-03-03"}, None)


def test_aplicar_retiro_total_borra_y_registra_dividendos():
    c = aplicar_retiro(INV, "total", 1000, None, "2026-03-03", "n", True)
    assert c.cambios == {} and c.borrar is True
    assert c.tx == {
        "fecha": "2026-03-03", "tipo": "ingreso", "categoria": "Dividendos",
        "descripcion": "Retiro total · CDT", "monto": 1000, "notas": "n",
    }


def test_aplicar_retiro_parcial_prorratea_y_no_borra():
    c = aplicar_retiro(INV, "parcial", 250, 750, "2026-03-03", "n", True)
    assert c.cambios == {"valor_actual": 750, "monto_invertido": 600.0, "valor_actualizado_en": "2026-03-03"}
    assert c.borrar is False and c.tx["descripcion"] == "Retiro parcial · CDT" and c.tx["monto"] == 250


def test_aplicar_retiro_sin_registrar_tx_devuelve_none():
    assert aplicar_retiro(INV, "total", 1000, None, "2026-03-03", "", False).tx is None
    assert aplicar_retiro(INV, "parcial", 250, 750, "2026-03-03", "", False).tx is None


def test_aplicar_retiro_parcial_exige_saldo_queda():
    assert _mensaje(aplicar_retiro, INV, "parcial", 250, None, "2026-03-03", "", True)[0] == "saldo_queda requerido para retiro parcial"


def test_alternar_activo_invierte():
    assert alternar_activo({"activo": True}) is False and alternar_activo({"activo": False}) is True
