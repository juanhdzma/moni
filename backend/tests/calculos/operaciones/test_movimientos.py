import pytest

from backend.calculos.base.errores import ErrorDeDominio

from backend.calculos.operaciones.movimientos import (
    aplicar_pago,
    saldo_tras_adelanto,
    tx_credito_recibido,
    proxima_cuota_tras_pago,
    retiro_parcial,
    sumar_un_mes,
    validar_adelanto,
    validar_cambio_de_tipo,
    validar_pago,
    valor_estimado_tras_aporte,
)


def test_retiro_parcial_prorratea_invertido():
    r = retiro_parcial(1000, 800, 250, 750)
    assert (r.valor_actual, r.monto_invertido) == (750.0, 600.0)


def test_retiro_parcial_redondeo_en_borde_medio_peso():
    assert retiro_parcial(1000, 5, 500, 500).monto_invertido == 3.0
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


def _deuda(**kw):
    return {"nombre": "Credito", "saldo_actual": 1_000_000, "es_tarjeta": 0, "proxima_cuota": "2026-01-31", **kw}


def _pago(deuda, **kw):
    base = dict(
        total_pagado=100_000, nuevo_saldo=920_000, intereses=None, avanzar_cuota=True,
        fecha="2026-02-01", descripcion="", notas="", simbolo="$",
    )
    return aplicar_pago(deuda, **{**base, **kw})


def test_aplicar_pago_deriva_intereses_cuota_y_tx():
    p = _pago(_deuda())
    assert (p.saldo_actual, p.intereses, p.proxima_cuota) == (920_000, 20_000, "2026-02-28")
    assert p.tx["descripcion"] == "Cuota · Credito (capital $80.000, intereses $20.000)"
    assert p.tx["monto"] == 100_000 and p.tx["tipo"] == "transfer"


def test_aplicar_pago_respeta_intereses_y_descripcion_explicitos():
    p = _pago(_deuda(), intereses=5_000, descripcion="Mia", avanzar_cuota=False)
    assert (p.intereses, p.proxima_cuota, p.tx["descripcion"]) == (5_000, None, "Mia")


def test_aplicar_pago_rechaza_subir_el_saldo():
    with pytest.raises(ErrorDeDominio):
        _pago(_deuda(), nuevo_saldo=1_100_000)


def test_saldo_tras_adelanto():
    assert saldo_tras_adelanto(1_000_000, None, 890_000) == 110_000
    assert saldo_tras_adelanto(None, 5, None) == 5
    with pytest.raises(ErrorDeDominio):
        saldo_tras_adelanto(0, None, 1)


def test_tx_credito_recibido_cae_al_saldo_sin_monto_inicial():
    tx = tx_credito_recibido({"nombre": "X", "fecha_inicio": "2026-01-01", "monto_inicial": 0, "saldo_actual": 700})
    assert tx["monto"] == 700 and tx["descripcion"] == "Crédito · X" and tx["fecha"] == "2026-01-01"


def test_sumar_un_mes_con_fecha_invalida_es_error_de_dominio():
    for mala in ["", "nope", "2026-13-45"]:
        with pytest.raises(ErrorDeDominio):
            sumar_un_mes(mala)


def test_sumar_un_mes_acepta_formato_legacy():
    assert sumar_un_mes("31/1/2025") == "2025-02-28"


def test_validar_pago_liquidar_exige_saldo_cero():
    validar_pago(1000, 0, liquidar=True)
    with pytest.raises(ErrorDeDominio):
        validar_pago(1000, 1, liquidar=True)
    validar_pago(1000, 1)


def test_el_rendimiento_capitalizado_redondea_el_residuo_de_la_base_legacy():
    from backend.calculos.operaciones.movimientos import aplicar_rendimiento

    inv = {"nombre": "X", "valor_actual": 1000.0000000001}
    cambio = aplicar_rendimiento(inv, 10, "2026-01-01", "", True, False)
    assert cambio.cambios["valor_actual"] == 1010.0


def test_el_aporte_sin_nuevo_valor_redondea_el_estimado():
    from backend.calculos.operaciones.movimientos import aplicar_aporte

    inv = {"nombre": "X", "valor_actual": 999.9999999999, "monto_invertido": 500.0000000001}
    cambio = aplicar_aporte(inv, 10, None, "2026-01-01", "", False)
    assert cambio.cambios["valor_actual"] == 1010.0 and cambio.cambios["monto_invertido"] == 510.0


def test_parse_clave_invalida_es_error_de_dominio():
    from backend.calculos.operaciones.proximas import parse_clave

    with pytest.raises(ErrorDeDominio):
        parse_clave("mal")


def _mensaje(fn, *args, **kw):
    with pytest.raises(ErrorDeDominio) as e:
        fn(*args, **kw)
    return e.value.mensaje, e.value.status


def test_mensajes_exactos_de_validaciones():
    assert _mensaje(retiro_parcial, 1000, 800, 250, 1001) == ("El saldo que queda no puede superar el valor actual", 400)
    assert _mensaje(validar_pago, 100, 101) == ("El saldo después del pago no puede superar el saldo actual", 400)
    assert _mensaje(validar_pago, 100, 5, True) == ("Para liquidar, el saldo después del pago debe ser 0", 400)
    assert _mensaje(validar_adelanto, False, 1, 2) == ("Solo las tarjetas admiten adelantos", 400)
    assert _mensaje(validar_adelanto, True, 100, 99) == ("El saldo después del adelanto no puede ser menor al saldo actual", 400)
    assert _mensaje(sumar_un_mes, "nope") == ("Fecha inválida: nope", 400)
    assert _mensaje(saldo_tras_adelanto, None, None, 5) == ("La tarjeta no tiene cupo definido", 400)
    assert _mensaje(validar_cambio_de_tipo, True, False, True) == (
        "No se puede cambiar el tipo de una deuda que tiene movimientos ligados", 400,
    )


def test_validar_cambio_de_tipo_solo_falla_si_cambia_y_hay_tx():
    validar_cambio_de_tipo(True, True, True)
    validar_cambio_de_tipo(False, False, True)
    validar_cambio_de_tipo(True, False, False)
    validar_cambio_de_tipo(False, True, False)
    assert _mensaje(validar_cambio_de_tipo, False, True, True)[1] == 400


def test_retiro_parcial_prorratea_con_valor_actual_de_un_peso():
    r = retiro_parcial(1, 100, 1, 0)
    assert (r.valor_actual, r.monto_invertido) == (0, 0.0)
    assert retiro_parcial(1, 100, 0.5, 0).monto_invertido == 50.0


def test_aplicar_pago_con_saldo_residual_de_un_peso_no_liquida_la_cuota():
    p = _pago(_deuda(), total_pagado=999_999, nuevo_saldo=1)
    assert p.saldo_actual == 1 and p.proxima_cuota == "2026-02-28"
    assert _pago(_deuda(), total_pagado=1_000_000, nuevo_saldo=0).proxima_cuota == ""


def test_aplicar_pago_de_tarjeta_no_toca_la_fecha_y_deja_la_tx_exacta():
    p = _pago(_deuda(es_tarjeta=1), notas="n", simbolo="US$")
    assert p.proxima_cuota is None
    assert p.tx == {
        "fecha": "2026-02-01", "tipo": "transfer", "categoria": "Pago deuda",
        "descripcion": "Cuota · Credito (capital US$80.000, intereses US$20.000)", "monto": 100_000, "notas": "n",
    }


def test_aplicar_pago_redondea_saldo_e_intereses():
    p = _pago(_deuda(), nuevo_saldo=920_000.4, intereses=10.5)
    assert (p.saldo_actual, p.intereses) == (920_000.0, 11.0)


def test_tx_credito_recibido_completa():
    d = {"nombre": "Banco", "fecha_inicio": "2026-01-02", "monto_inicial": 5000, "saldo_actual": 700}
    assert tx_credito_recibido(d) == {
        "fecha": "2026-01-02", "tipo": "ingreso", "categoria": "Crédito recibido",
        "descripcion": "Crédito · Banco", "monto": 5000, "notas": "",
    }


def test_aplicar_pago_propaga_la_bandera_liquidar():
    assert _pago(_deuda(), total_pagado=1_000_000, nuevo_saldo=0, liquidar=True).saldo_actual == 0
    assert _mensaje(_pago, _deuda(), nuevo_saldo=5, liquidar=True)[0] == "Para liquidar, el saldo después del pago debe ser 0"
    assert _pago(_deuda(), nuevo_saldo=5).saldo_actual == 5
