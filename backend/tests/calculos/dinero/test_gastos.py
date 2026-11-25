import datetime

import pytest

from backend.calculos.dinero.gastos import (
    PERIODOS_EVOLUCION_VISIBLES,
    PERIODOS_GASTOS,
    agrupar_gastos,
    gastos_en_periodo,
    gastos_periodo,
    movimientos_dashboard,
    movimientos_recientes,
    opciones_periodo,
)

from ..builders_calculos import HOY, tx


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
    assert fila["restantes_texto"] == "y 2 más en Transacciones"


def test_gastos_periodo_top_y_total():
    r = gastos_periodo([tx("gasto", "A", 30), tx("gasto", "B", 10)], "1M", HOY)
    assert "el último mes" in r["frase"]["texto"]
    assert r["total"] == 40
    assert r["max"] == 30
    assert r["top"] == {"categoria": "A", "valor": 30, "pct": 75}
    vacio = gastos_periodo([], "ALL", HOY)
    assert vacio["top"] is None and vacio["total"] == 0 and vacio["max"] == 0


def test_agrupar_gastos_pct_por_fila_con_piso():
    txs = [
        {"id": 1, "fecha": "2026-08-01", "descripcion": "", "categoria": "A", "monto": 1000},
        {"id": 2, "fecha": "2026-08-01", "descripcion": "", "categoria": "B", "monto": 5},
    ]
    filas = agrupar_gastos(txs)
    assert [f["pct"] for f in filas] == [100, 2]


def test_movimientos_dashboard_trae_atributos_y_texto_vacio():
    from backend.calculos.dinero.gastos import movimientos_dashboard

    r = movimientos_dashboard([{"id": 1, "fecha": "2026-08-01", "tipo": "transfer", "categoria": "Pago deuda", "descripcion": "", "monto": 5}])
    assert (r["items"][0]["editable"], r["items"][0]["tono"], r["items"][0]["icono_metodo"]) == (False, "neutro", "efectivo")
    assert movimientos_dashboard([])["texto_vacio"]["titulo"] == "Sin transacciones"


def test_gastos_periodo_respeta_la_ventana_del_periodo():
    txs = [tx("gasto", "Viejo", 900, fecha="2026-01-10"), tx("gasto", "Reciente", 100, fecha="2026-08-10")]
    r = gastos_periodo(txs, "1M", HOY)
    assert (r["total"], r["max"], [c["categoria"] for c in r["categorias"]]) == (100, 100, ["Reciente"])
    assert r["top"] == {"categoria": "Reciente", "valor": 100, "pct": 100}
    assert gastos_periodo(txs, "ALL", HOY)["total"] == 1000
    assert gastos_periodo(txs, "1Y", HOY)["total"] == 1000


def test_gastos_periodo_objeto_completo_con_frase_y_textos():
    r = gastos_periodo([tx("gasto", "Mercado", 300, id=1, descripcion="Exito"), tx("gasto", "Ocio", 100, id=2)], "3M", HOY)
    assert r["periodo"] == "3M" and r["texto_vacio"] == "Sin gastos para este período"
    assert r["texto_total"] == "Total gastado, con tarjetas"
    assert r["frase"] == {
        "texto": "Mercado se lleva el 75% de lo que gastaste en los últimos 3 meses.",
        "partes": [
            {"texto": "Mercado", "tono": "fuerte"}, {"texto": " se lleva el ", "tono": None},
            {"texto": "75%", "tono": "fuerte"}, {"texto": " de lo que gastaste en los últimos 3 meses.", "tono": None},
        ],
    }
    assert r["categorias"][0] == {
        "categoria": "Mercado", "valor": 300, "n": 1, "pct": 100, "restantes_texto": None,
        "detalle": [{"id": 1, "fecha": "2026-08-10", "descripcion": "Exito", "categoria": "Mercado", "monto": 300}],
    }


def test_frase_de_gastos_nombra_cada_periodo_y_redondea_el_porcentaje():
    nombres = {"1W": "la última semana", "1M": "el último mes", "3M": "los últimos 3 meses", "6M": "los últimos 6 meses",
               "1Y": "el último año", "ALL": "todo el historial"}
    for periodo, nombre in nombres.items():
        assert gastos_periodo([tx("gasto", "A", 1)], periodo, HOY)["frase"]["texto"].endswith(f"de lo que gastaste en {nombre}.")
    uno_de_tres = gastos_periodo([tx("gasto", "A", 1), tx("gasto", "B", 1), tx("gasto", "C", 1)], "1M", HOY)
    assert uno_de_tres["top"]["pct"] == pytest.approx(100 / 3) and "33%" in uno_de_tres["frase"]["texto"]


def test_gastos_periodo_vacio_no_tiene_frase():
    r = gastos_periodo([], "1M", HOY)
    assert r["frase"] is None and r["categorias"] == [] and r["top"] is None


def test_gastos_periodo_con_total_cero_no_divide():
    r = gastos_periodo([{**tx("gasto", "A", 0)}], "1M", HOY)
    assert r["top"] == {"categoria": "A", "valor": 0, "pct": 0} and r["total"] == 0


def test_opciones_periodo():
    assert opciones_periodo(PERIODOS_GASTOS) == [
        {"value": "1W", "label": "1S"}, {"value": "1M", "label": "1M"}, {"value": "3M", "label": "3M"},
        {"value": "6M", "label": "6M"}, {"value": "1Y", "label": "1A"}, {"value": "ALL", "label": "Todo"},
    ]
    assert opciones_periodo(PERIODOS_EVOLUCION_VISIBLES) == [
        {"value": "3M", "label": "3M"}, {"value": "6M", "label": "6M"}, {"value": "1Y", "label": "1A"}, {"value": "ALL", "label": "Todo"},
    ]


def test_movimientos_recientes_por_defecto_son_cinco_y_firman_el_monto():
    txs = [tx("gasto", "a", 1, fecha=f"2026-08-0{d}", id=d) for d in range(1, 7)]
    assert [m["id"] for m in movimientos_recientes(txs)] == [6, 5, 4, 3, 2]
    assert len(movimientos_dashboard(txs)["items"]) == 5 and len(movimientos_dashboard(txs, 3)["items"]) == 3
    assert len(movimientos_recientes(txs, 6)) == 6
    assert movimientos_recientes([tx("ingreso", "s", 50)])[0]["monto_firmado"] == 50
    assert movimientos_recientes([tx("gasto", "s", 50)])[0]["monto_firmado"] == -50


def test_movimiento_reciente_completo():
    t = tx("gasto", "Mercado", 80, fecha="2026-08-10T09:00", id=4, descripcion="Exito")
    assert movimientos_recientes([t]) == [{
        "id": 4, "fecha": "2026-08-10T09:00", "tipo": "gasto", "categoria": "Mercado", "descripcion": "Exito", "monto": 80,
        "monto_firmado": -80, "editable": True, "tono": "gasto", "icono_metodo": "efectivo",
    }]


def test_gastos_en_periodo_ignora_fechas_invalidas_y_ventana_semanal():
    txs = [tx("gasto", "x", 1, fecha="basura"), tx("gasto", "x", 1, fecha="2026-08-08"), tx("gasto", "x", 1, fecha="2026-08-07")]
    assert [t["fecha"] for t in gastos_en_periodo(txs, "1W", HOY)] == ["2026-08-08"]
    assert len(gastos_en_periodo(txs, "ALL", HOY)) == 3
