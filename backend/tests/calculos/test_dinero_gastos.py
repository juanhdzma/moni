import datetime

from backend.calculos.dinero import agrupar_gastos, gastos_en_periodo, gastos_periodo, movimientos_recientes

from .builders_calculos import HOY, tx


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
    from backend.calculos.dinero import movimientos_dashboard

    r = movimientos_dashboard([{"id": 1, "fecha": "2026-08-01", "tipo": "transfer", "categoria": "Pago deuda", "descripcion": "", "monto": 5}])
    assert (r["items"][0]["editable"], r["items"][0]["tono"], r["items"][0]["icono_metodo"]) == (False, "neutro", "efectivo")
    assert movimientos_dashboard([])["texto_vacio"]["titulo"] == "Sin transacciones"
