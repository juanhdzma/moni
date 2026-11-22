import datetime

import pytest

from backend.calculos.dinero import (
    agrupar_gastos,
    este_mes,
    etiquetas_meses,
    evolucion,
    flujo_cartera,
    flujo_patrimonio,
    gastos_en_periodo,
    gastos_periodo,
    meses_periodo,
    monthly_inv_delta,
    monthly_patrimonio,
    movimientos_recientes,
    net_worth,
    partes_patrimonio,
    resumen_dashboard,
    serie_hacia_atras,
)
from backend.calculos.listados import tiene_saldo

HOY = datetime.date(2026, 8, 15)


def tx(tipo, categoria, monto, fecha="2026-08-10", tarjeta_id=None, id=1, descripcion=""):
    return {
        "id": id,
        "tipo": tipo,
        "categoria": categoria,
        "monto": monto,
        "fecha": fecha,
        "tarjeta_id": tarjeta_id,
        "descripcion": descripcion,
    }


def deuda(saldo_actual=0, cuota_mensual=0):
    return {"saldo_actual": saldo_actual, "cuota_mensual": cuota_mensual}


def inversion(valor_actual=0, monto_invertido=0, fecha_inicio=None):
    return {"valor_actual": valor_actual, "monto_invertido": monto_invertido, "fecha_inicio": fecha_inicio}


def activo(valor_actual=0):
    return {"valor_actual": valor_actual}


def estado(**kw):
    base = {"transacciones": [], "deudas": [], "inversiones": [], "activos": []}
    base.update(kw)
    return base


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
    assert meses_periodo("1M", [], HOY) == 2
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


def test_resumen_dashboard_kpis_del_mes_y_ahorro_acotado_al_mes():
    e = estado(
        transacciones=[
            tx("ingreso", "Salario", 5_000_000, fecha="2026-07-10"),
            tx("ingreso", "Salario", 1_000_000, fecha="2026-08-02"),
            tx("gasto", "Mercado", 250_000, fecha="2026-08-03"),
            tx("gasto", "Ropa", 100_000, fecha="2026-08-04", tarjeta_id=1),
        ],
        deudas=[deuda(500_000, 50_000), deuda(0.2, 9)],
        inversiones=[inversion(1_100_000, 1_000_000)],
    )
    r = resumen_dashboard(e, HOY)
    assert r["ingresos_mes"] == 1_000_000
    assert r["gastos_mes"] == 250_000
    assert r["quedo_mes"] == 750_000
    assert r["ahorro_pct"] == 75
    assert r["efectivo"] == 5_000_000 + 1_000_000 - 250_000
    assert r["deudas_activas"] == 1
    assert r["cuota_total"] == 50_000
    assert r["ganancia_inv"] == 100_000
    assert r["ganancia_inv_pct"] == pytest.approx(10)
    assert r["frase_mes"] == {"tipo": "quedo", "pct": 75}


def test_resumen_dashboard_sin_ingresos_no_divide_por_cero():
    r = resumen_dashboard(estado(), HOY)
    assert r["ahorro_pct"] == 0
    assert r["ganancia_inv_pct"] == 0
    assert r["proy_delta"] == 0
    assert r["frase_mes"] == {"tipo": "sin_ingresos"}


def test_partes_patrimonio_textos_de_dominio():
    e = estado(
        deudas=[deuda(500_000, 50_000)],
        inversiones=[inversion(1_100_000, 1_000_000)],
        activos=[activo(10)],
    )
    partes = partes_patrimonio(resumen_dashboard(e, HOY), {"activos": 1, "inversiones": 1})
    por_id = {p["id"]: p for p in partes}
    assert por_id["activos"]["detalle"] == "1 activo"
    assert por_id["inversiones"]["detalle"] is None
    assert por_id["inversiones"]["detalle_datos"]["ganancia"] == 100_000
    assert por_id["deudas"]["detalle_datos"] == {"cuota_total": 50_000, "n": "1 deuda"}
    assert por_id["deudas"]["negativo"] is True
    sin_inv = partes_patrimonio(resumen_dashboard(estado(), HOY), {"activos": 0, "inversiones": 2})
    assert sin_inv[1]["detalle"] == "2 posiciones"


def test_evolucion_cierra_en_el_patrimonio_y_arma_la_frase():
    e = estado(
        transacciones=[
            tx("ingreso", "Salario", 5_000_000, fecha="2026-07-10"),
            tx("gasto", "Mercado", 300_000, fecha="2026-08-02"),
        ],
        inversiones=[inversion(1_500_000)],
    )
    r = evolucion(e, "patrimonio", "3M", HOY)
    assert r["meses"] == 3
    assert [p["mes"] for p in r["puntos"]] == ["jun.", "jul.", "ago."]
    assert r["hasta"] == 5_000_000 - 300_000 + 1_500_000
    assert r["verbo"] == "Subiste"
    assert r["sujeto"] == ""
    assert r["mes_desde"] == "jun."
    inv = evolucion(e, "inversiones", "1M", HOY)
    assert inv["sujeto"] == " en inversiones"
    assert inv["hasta"] == 1_500_000
    assert inv["verbo"] == "Te mantuviste"


def test_este_mes_agrupa_ingresos_y_gastos_de_cartera():
    e = estado(
        transacciones=[
            tx("ingreso", "Salario", 4_000, fecha="2026-08-02"),
            tx("gasto", "Mercado", 1_000, fecha="2026-08-03"),
            tx("gasto", "Ropa", 500, fecha="2026-08-04", tarjeta_id=1),
            tx("gasto", "Mercado", 700, fecha="2026-07-04"),
        ]
    )
    r = este_mes(e, HOY)
    assert (r["ingresos"], r["gastos"], r["quedo"]) == (4_000, 1_000, 3_000)
    assert r["ahorro_pct"] == 75
    assert len(r["meses"]) == 6
    assert r["meses"][-1] == {"mes": "ago.", "entro": 4_000, "salio": 1_000}
    assert r["meses"][-2]["salio"] == 700


def test_movimientos_recientes_ordena_por_fecha_desc_y_corta_en_n():
    txs = [
        tx("gasto", "a", 1, fecha="2026-01-01"),
        tx("gasto", "b", 1, fecha="2026-03-01"),
        tx("gasto", "c", 1, fecha="2026-02-01"),
    ]
    assert [t["categoria"] for t in movimientos_recientes(txs, 2)] == ["b", "c"]


def test_gastos_en_periodo_ventana_inclusiva_en_hora_local_y_recorte_de_dia():
    def g(fecha):
        return tx("gasto", "x", 1, fecha=fecha)

    txs = [g("2026-07-15"), g("2026-07-14"), g("2026-08-14T10:00"), tx("ingreso", "x", 1, fecha="2026-08-14")]
    assert [t["fecha"] for t in gastos_en_periodo(txs, "1M", HOY)] == ["2026-07-15", "2026-08-14T10:00"]
    assert len(gastos_en_periodo(txs, "ALL", HOY)) == 3
    assert [t["fecha"] for t in gastos_en_periodo(txs, "1W", HOY)] == ["2026-08-14T10:00"]
    fin_mes = gastos_en_periodo([g("2026-02-28"), g("2026-02-27")], "1M", datetime.date(2026, 3, 31))
    assert [t["fecha"] for t in fin_mes] == ["2026-02-28"]


def test_agrupar_gastos_suma_por_categoria_y_ordena_de_mayor_a_menor():
    filas = agrupar_gastos(
        [tx("gasto", "A", 10), tx("gasto", "B", 50), tx("gasto", "A", 15), tx("gasto", "", 1)]
    )
    assert [(f["categoria"], f["valor"]) for f in filas] == [("B", 50), ("A", 25), ("Otros", 1)]
    assert filas[1]["n"] == 2


def test_agrupar_gastos_recorta_el_detalle_a_seis():
    txs = [tx("gasto", "A", 1, fecha=f"2026-08-{d:02d}", id=d) for d in range(1, 9)]
    fila = agrupar_gastos(txs)[0]
    assert [d["id"] for d in fila["detalle"]] == [8, 7, 6, 5, 4, 3]
    assert fila["restantes"] == 2


def test_gastos_periodo_top_y_total():
    r = gastos_periodo([tx("gasto", "A", 30), tx("gasto", "B", 10)], "1M", HOY)
    assert r["nombre_periodo"] == "el último mes"
    assert r["total"] == 40
    assert r["max"] == 30
    assert r["top"] == {"categoria": "A", "valor": 30, "pct": 75}
    vacio = gastos_periodo([], "ALL", HOY)
    assert vacio["top"] is None and vacio["total"] == 0 and vacio["max"] == 0


def test_desactualizado_corta_a_mediodia_bogota():
    import datetime

    from backend.calculos.fechas import TZ, es_desactualizado

    hoy = datetime.date(2026, 6, 15)
    antes = datetime.datetime(2026, 6, 15, 11, 59, tzinfo=TZ)
    despues = datetime.datetime(2026, 6, 15, 12, 0, tzinfo=TZ)
    assert not es_desactualizado("2026-05-16", hoy, ahora=antes)
    assert es_desactualizado("2026-05-16", hoy, ahora=despues)
