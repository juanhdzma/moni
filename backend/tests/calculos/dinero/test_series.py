import datetime

from backend.calculos.dinero import series as S

from ..builders_calculos import HOY, tx

D = datetime.date


def test_clave_mes_cruza_el_anio():
    assert [S.clave_mes(HOY, k) for k in (0, 1, 7, 8, 12)] == ["2026-08", "2026-07", "2026-01", "2025-12", "2025-08"]
    assert S.clave_mes(D(2026, 1, 31), 1) == "2025-12" and S.clave_mes(D(2026, 1, 31), 0) == "2026-01"


def test_etiquetas_meses_termina_en_el_mes_actual():
    assert S.etiquetas_meses(3, HOY) == ["jun.", "jul.", "ago."]
    assert S.etiquetas_meses(2, D(2026, 1, 15)) == ["dic.", "ene."]
    assert S.etiquetas_meses(0, HOY) == []


def test_serie_mensual_agrupa_por_mes_y_rellena_vacios():
    txs = [tx("gasto", "a", 10, fecha="2026-08-01"), tx("gasto", "a", 5, fecha="2026-08-09T10:00"), tx("gasto", "a", 7, fecha="2026-06-30")]
    assert S.serie_mensual(txs, 3, lambda l: sum(t["monto"] for t in l), HOY) == [7, 0, 15]
    assert S.serie_mensual([], 2, len, HOY) == [0, 0]


def test_serie_hacia_atras_resta_los_deltas_posteriores():
    assert S.serie_hacia_atras(100, [5, 10, 20]) == [70, 80, 100]
    assert S.serie_hacia_atras(100, [50]) == [100]
    assert S.serie_hacia_atras(100, []) == []
    assert S.serie_hacia_atras(0, [0, 0]) == [0, 0]


def test_monthly_patrimonio_e_inversiones():
    txs = [tx("ingreso", "Salario", 100, fecha="2026-08-01"), tx("gasto", "Inversión", 40, fecha="2026-07-01"),
           tx("ingreso", "Dividendos", 10, fecha="2026-08-02")]
    assert S.monthly_patrimonio(txs, 2, HOY) == [0, 100]
    assert S.monthly_inv_delta(txs, 2, HOY) == [40, -10]


def test_fechas_de_transacciones_e_inversiones_se_recortan_a_dia():
    assert S.fechas_transacciones([tx("gasto", "a", 1, fecha="2026-08-01T10:30"), tx("gasto", "a", 1, fecha="3/8/2026")]) == ["2026-08-01", "2026-08-03"]
    invs = [{"fecha_inicio": "2026-05-01T10:30"}, {"fecha_inicio": None}, {"fecha_inicio": ""}, {"fecha_inicio": "1/2/2026"}]
    assert S.fechas_inversiones(invs) == ["2026-05-01", None, None, "2026-02-01"]


def test_meses_periodo_fijos_y_all():
    assert [S.meses_periodo(p, [], HOY) for p in ("3M", "6M", "1Y")] == [3, 6, 12]
    assert S.meses_periodo("ALL", [], HOY) == 6
    assert S.meses_periodo("ALL", [None, ""], HOY) == 6
    assert S.meses_periodo("ALL", ["2026-08-01"], HOY) == 2
    assert S.meses_periodo("ALL", ["2026-07-30", "2026-08-01"], HOY) == 2
    assert S.meses_periodo("ALL", ["2026-03-10", None, "2026-06-01"], HOY) == 6
    assert S.meses_periodo("ALL", ["2025-08-01"], HOY) == 13
    assert S.meses_periodo("ALL", ["basura"], HOY) == 6
    assert S.meses_periodo("otro", ["2026-05-01"], HOY) == 4
