import datetime

from backend.calculos.dinero import (
    etiquetas_meses,
    flujo_cartera,
    flujo_patrimonio,
    meses_periodo,
    monthly_inv_delta,
    monthly_patrimonio,
    net_worth,
    serie_hacia_atras,
)
from backend.calculos.constantes import tiene_saldo

from .builders_calculos import HOY, activo, deuda, estado, inversion, tx


def test_la_cartera_ignora_los_gastos_con_tarjeta_y_descuenta_los_transfers():
    lista = [
        tx("ingreso", "Salario", 5_000_000),
        tx("gasto", "Mercado", 300_000),
        tx("gasto", "Ropa", 200_000, tarjeta_id=1),
        tx("transfer", "Pago deuda", 1_000_000),
    ]
    assert flujo_cartera(lista) == 5_000_000 - 300_000 - 1_000_000


def test_el_patrimonio_descuenta_el_gasto_con_tarjeta():
    assert flujo_patrimonio([tx("gasto", "Ropa", 200_000, tarjeta_id=1)]) == -200_000


def test_pagar_una_deuda_no_cambia_el_patrimonio():
    assert flujo_patrimonio([tx("transfer", "Pago deuda", 1_000_000)]) == 0


def test_mover_plata_entre_bolsillos_no_cambia_el_patrimonio():
    neutras = [
        tx("gasto", "Inversión", 500_000),
        tx("gasto", "Compra activos", 900_000),
        tx("ingreso", "Crédito recibido", 2_000_000),
        tx("ingreso", "Avance de tarjeta", 300_000),
        tx("ingreso", "Venta activos", 900_000),
        tx("ingreso", "Dividendos", 100_000),
    ]
    assert flujo_patrimonio(neutras) == 0
    for t in neutras:
        assert flujo_patrimonio([t]) == 0, t["categoria"]


def test_ingresos_y_gastos_normales_mueven_el_patrimonio():
    assert flujo_patrimonio([tx("ingreso", "Salario", 5_000_000), tx("gasto", "Mercado", 300_000)]) == 4_700_000


def test_la_curva_de_evolucion_cierra_en_el_patrimonio_actual():
    e = estado(
        transacciones=[
            tx("ingreso", "Salario", 5_000_000, fecha="2026-07-10"),
            tx("gasto", "Mercado", 300_000, fecha="2026-08-02"),
            tx("transfer", "Pago deuda", 1_000_000, fecha="2026-08-05"),
        ],
        deudas=[deuda(2_000_000)],
        inversiones=[inversion(1_500_000)],
    )
    patrimonio = net_worth(e["transacciones"], e["inversiones"], e["activos"], e["deudas"])
    deltas = monthly_patrimonio(e["transacciones"], 3, HOY)
    data = serie_hacia_atras(patrimonio, deltas)

    assert data[2] == patrimonio
    assert deltas[2] == -300_000
    assert data[1] == patrimonio + 300_000
    assert data[0] == patrimonio + 300_000 - 5_000_000


def test_la_serie_mensual_respeta_la_ventana_de_meses():
    txs = [
        tx("ingreso", "Salario", 1_000, fecha="2026-08-03"),
        tx("ingreso", "Salario", 2_000, fecha="2026-07-03"),
        tx("ingreso", "Salario", 4_000, fecha="2026-05-03"),
    ]
    assert monthly_patrimonio(txs, 3, HOY) == [0, 2_000, 1_000]


def test_la_serie_mensual_cruza_el_cambio_de_anio():
    txs = [tx("ingreso", "Salario", 7, fecha="2025-12-03")]
    assert monthly_patrimonio(txs, 3, datetime.date(2026, 1, 20)) == [0, 7, 0]


def test_un_residuo_flotante_no_mantiene_viva_una_deuda_pagada():
    assert tiene_saldo({"saldo_actual": 1.16e-10}) is False
    assert tiene_saldo({"saldo_actual": 0}) is False
    assert tiene_saldo({"saldo_actual": 0.4}) is False
    assert tiene_saldo({"saldo_actual": 1}) is True
    assert tiene_saldo({"saldo_actual": 250_000}) is True


def test_el_rendimiento_no_infla_el_patrimonio_por_los_dos_lados():
    pagado = estado(transacciones=[tx("ingreso", "Intereses", 95_000)], inversiones=[inversion(1_000_000)])
    assert net_worth(pagado["transacciones"], pagado["inversiones"], pagado["activos"], pagado["deudas"]) == 1_095_000

    capitalizado = estado(inversiones=[inversion(1_095_000)])
    assert (
        net_worth(capitalizado["transacciones"], capitalizado["inversiones"], capitalizado["activos"], capitalizado["deudas"])
        == 1_095_000
    )


def test_la_curva_de_inversiones_sigue_aportes_y_retiros_no_rendimientos():
    txs = [
        tx("gasto", "Inversión", 500_000, fecha="2026-08-04"),
        tx("ingreso", "Dividendos", 200_000, fecha="2026-08-06"),
        tx("ingreso", "Intereses", 95_000, fecha="2026-08-08"),
    ]
    assert monthly_inv_delta(txs, 2, HOY) == [0, 300_000]


def test_net_worth_suma_activos_y_resta_deudas():
    assert net_worth([], [], [activo(10_000_000)], [deuda(4_000_000)]) == 6_000_000


def test_meses_periodo_fijos_y_todo_desde_la_fecha_mas_antigua():
    assert meses_periodo("3M", [], HOY) == 3
    assert meses_periodo("6M", [], HOY) == 6
    assert meses_periodo("1Y", [], HOY) == 12
    assert meses_periodo("ALL", [], HOY) == 6
    assert meses_periodo("ALL", ["2026-08-01"], HOY) == 2
    assert meses_periodo("ALL", ["2026-03-01", "2026-08-01", None, ""], HOY) == 6
    assert meses_periodo("ALL", ["2025-08-01"], HOY) == 13


def test_etiquetas_meses_arrancan_count_menos_uno_atras():
    assert len(etiquetas_meses(3, HOY)) == 3
    assert etiquetas_meses(1, HOY) == ["ago."]
    assert etiquetas_meses(3, datetime.date(2026, 1, 5))[0] == "nov."


def test_net_worth_ignora_deuda_saldada_pero_cuenta_tarjeta_en_cero():
    saldada = {**deuda(0.4), "es_tarjeta": 0}
    tarjeta = {**deuda(500_000), "es_tarjeta": 1}
    assert net_worth([], [], [activo(1_000_000)], [saldada, tarjeta]) == 500_000
    assert net_worth([], [], [], [saldada]) == 0
