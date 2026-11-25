import pytest

from backend.calculos.errores import ErrorDeDominio
from backend.calculos.operaciones import asientos, movimientos, tarjetas
from backend.calculos.fechas import fecha_o_ahora
from backend.calculos.operaciones.resumenes import con_categoria_sugerida, resumen_activos, resumen_inversiones


def _tx(tipo="gasto", tarjeta_id=1, monto=100):
    return {"tipo": tipo, "tarjeta_id": tarjeta_id, "monto": monto}


def test_delta_saldo_tarjeta():
    assert tarjetas.delta_saldo_tarjeta(_tx()) == 100
    assert tarjetas.delta_saldo_tarjeta(_tx(), deshacer=True) == -100
    assert tarjetas.delta_saldo_tarjeta(_tx(tipo="ingreso")) == 0
    assert tarjetas.delta_saldo_tarjeta(_tx(tarjeta_id=None)) == 0


def test_saldo_tras_delta_redondea_y_valida_tarjeta():
    assert tarjetas.saldo_tras_delta({"id": 1, "es_tarjeta": 1, "saldo_actual": 0.1}, 0.2) == 0
    with pytest.raises(ErrorDeDominio):
        tarjetas.saldo_tras_delta({"id": 1, "es_tarjeta": 0, "saldo_actual": 0}, 5)


def test_asiento_adelanto_tarjeta():
    tx = asientos.tx_adelanto_tarjeta("Visa", 50, "2026-01-01", None, "n")
    assert tx["tipo"] == "ingreso" and tx["monto"] == 50 and "Visa" in tx["descripcion"]
    assert asientos.tx_adelanto_tarjeta("Visa", 50, "2026-01-01", "propia", "")["descripcion"] == "propia"


def test_alternar_activo():
    assert movimientos.alternar_activo({"activo": 1}) is False
    assert movimientos.alternar_activo({"activo": 0}) is True


def test_fecha_o_ahora():
    assert fecha_o_ahora("2026-01-01") == "2026-01-01"
    assert "T" in fecha_o_ahora(None)


def test_resumenes_incluyen_textos():
    assert resumen_inversiones([])["texto_posiciones"] == "0 posiciones"
    assert resumen_activos([])["texto_conteo"] == "0 activos"
    cats = {"gasto": [{"nombre": "Z"}]}
    assert con_categoria_sugerida({"tipo": "gasto", "nombre": "Q"}, cats)["categoria_sugerida"] == "Z"


def test_validar_tarjeta_exige_una_tarjeta_existente():
    tarjetas.validar_tarjeta({"es_tarjeta": 1})
    for mala in (None, {"es_tarjeta": 0}):
        with pytest.raises(ErrorDeDominio):
            tarjetas.validar_tarjeta(mala)


def test_mensajes_de_error_de_tarjeta():
    with pytest.raises(ErrorDeDominio) as e:
        tarjetas.saldo_tras_delta({"id": 7, "es_tarjeta": 0, "saldo_actual": 0}, 5)
    assert str(e.value) == "La tarjeta 7 no es válida" and e.value.status == 400
    with pytest.raises(ErrorDeDominio) as e:
        tarjetas.validar_tarjeta(None)
    assert str(e.value) == "La tarjeta indicada no existe" and e.value.status == 400


def test_saldo_tras_delta_suma_el_delta():
    tarjeta = {"id": 1, "es_tarjeta": 1, "saldo_actual": 1000}
    assert tarjetas.saldo_tras_delta(tarjeta, 250) == 1250
    assert tarjetas.saldo_tras_delta(tarjeta, -250) == 750
