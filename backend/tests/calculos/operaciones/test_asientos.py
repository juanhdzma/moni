import pytest

from backend.calculos.operaciones import asientos as a


def test_tx_inversion_nueva():
    inv = {"fecha_inicio": "2026-03-01", "nombre": "CDT", "monto_invertido": 5_000_000}
    assert a.tx_inversion_nueva(inv) == {
        "fecha": "2026-03-01", "tipo": "gasto", "categoria": "Inversión",
        "descripcion": "Nueva inversión · CDT", "monto": 5_000_000, "notas": "",
    }


def test_tx_aporte_conserva_las_notas():
    assert a.tx_aporte("CDT", 100, "2026-03-02", "mi nota") == {
        "fecha": "2026-03-02", "tipo": "gasto", "categoria": "Inversión",
        "descripcion": "Aporte · CDT", "monto": 100, "notas": "mi nota",
    }


def test_tx_rendimiento_conserva_las_notas():
    assert a.tx_rendimiento("CDT", 80, "2026-03-03", "intereses marzo") == {
        "fecha": "2026-03-03", "tipo": "ingreso", "categoria": "Intereses",
        "descripcion": "Rendimiento · CDT", "monto": 80, "notas": "intereses marzo",
    }


@pytest.mark.parametrize("prefijo,texto", [("retiro_total", "Retiro total"), ("retiro_parcial", "Retiro parcial")])
def test_tx_retiro_es_ingreso_de_dividendos_con_notas(prefijo, texto):
    assert a.tx_retiro(prefijo, "CDT", 900, "2026-03-04", "n") == {
        "fecha": "2026-03-04", "tipo": "ingreso", "categoria": "Dividendos",
        "descripcion": f"{texto} · CDT", "monto": 900, "notas": "n",
    }


def test_tx_compra_activo():
    act = {"fecha_adquisicion": "2026-01-05", "nombre": "Moto", "valor_inicial": 9_000_000}
    assert a.tx_compra_activo(act) == {
        "fecha": "2026-01-05", "tipo": "gasto", "categoria": "Compra activos",
        "descripcion": "Compra · Moto", "monto": 9_000_000, "notas": "",
    }


def test_tx_venta_activo_conserva_las_notas():
    assert a.tx_venta_activo("Moto", 8_000_000, "2026-06-05", "vendida") == {
        "fecha": "2026-06-05", "tipo": "ingreso", "categoria": "Venta activos",
        "descripcion": "Venta · Moto", "monto": 8_000_000, "notas": "vendida",
    }


def test_tx_adelanto_tarjeta_usa_descripcion_dada_o_la_por_defecto():
    base = {"fecha": "2026-02-02", "tipo": "ingreso", "categoria": "Avance de tarjeta", "monto": 300, "notas": "n"}
    assert a.tx_adelanto_tarjeta("Visa", 300, "2026-02-02", None, "n") == {**base, "descripcion": "Adelanto · Visa"}
    assert a.tx_adelanto_tarjeta("Visa", 300, "2026-02-02", "", "n") == {**base, "descripcion": "Adelanto · Visa"}
    assert a.tx_adelanto_tarjeta("Visa", 300, "2026-02-02", "Avance viaje", "n") == {**base, "descripcion": "Avance viaje"}
