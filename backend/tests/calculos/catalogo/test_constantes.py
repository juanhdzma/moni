from backend.calculos.catalogo import constantes as C


def test_valores_extrae_el_value_de_cada_opcion():
    assert C.valores(C.TIPOS_TX) == ("ingreso", "gasto", "transfer")
    assert C.valores(C.TIPOS_INVERSION) == ("fija", "variable")
    assert C.valores(C.PAGOS_INVERSION) == ("mensual", "vencimiento")
    assert C.valores(C.CLASES_DEUDA) == ("prestamo", "tarjeta")
    assert C.valores(C.MONEDAS) == ("$", "US$", "€", "MX$", "£")
    assert C.valores([]) == ()
    assert isinstance(C.valores([{"value": 1}]), tuple)


def test_tiene_saldo_usa_el_umbral_de_un_peso():
    assert C.SALDO_MINIMO == 1
    assert C.tiene_saldo({"saldo_actual": 1}) is True
    assert C.tiene_saldo({"saldo_actual": 0.999}) is False
    assert C.tiene_saldo({"saldo_actual": 0}) is False
    assert C.tiene_saldo({"saldo_actual": 5_000_000}) is True


def test_clase_deuda_de():
    assert C.clase_deuda_de(1) == "tarjeta" and C.clase_deuda_de(True) == "tarjeta"
    assert C.clase_deuda_de(0) == "prestamo" and C.clase_deuda_de(None) == "prestamo"


def test_frase_aviso_diario():
    assert C.frase_aviso_diario("08:00") == "Aviso diario a las 08:00 de las cuotas, rendimientos y recurrentes que vencen hoy o mañana."


def test_limites_y_textos_de_contrato():
    assert C.LIMITES == {"nombre": 40, "descripcion": 120, "notas": 200, "dia_pago_max": 31, "clave": 256}
    assert C.CATEGORIA_LARGO_MAX == 25 and C.DIAS_DESACTUALIZADO == 30 and C.PALABRA_TRUNCATE == "BORRAR"
    assert C.TEXTO_DESACTUALIZADO == "Valor sin actualizar hace más de 1 mes"
    assert C.DEFAULTS_FORMULARIOS["orden_tx"] == {"col": "fecha", "dir": -1}
