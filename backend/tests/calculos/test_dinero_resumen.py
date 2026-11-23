import pytest

from backend.calculos.dinero import este_mes, evolucion, partes_patrimonio, resumen_dashboard

from .builders_calculos import HOY, activo, deuda, estado, inversion, tx


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
    assert r["frase_mes"]["tipo"] == "quedo" and r["frase_mes"]["pct"] == 75
    assert r["frase_mes"]["texto"] == "Te quedó el 75,0% de lo que entró."


def test_resumen_dashboard_sin_ingresos_no_divide_por_cero():
    r = resumen_dashboard(estado(), HOY)
    assert r["ahorro_pct"] == 0
    assert r["ganancia_inv_pct"] == 0
    assert r["proy_delta"] == 0
    assert r["frase_mes"]["tipo"] == "sin_ingresos"
    assert r["frase_mes"]["texto"] == "Todavía no entró plata este mes."


def test_partes_patrimonio_textos_de_dominio():
    e = estado(
        deudas=[deuda(500_000, 50_000)],
        inversiones=[inversion(1_100_000, 1_000_000)],
        activos=[activo(10)],
    )
    partes = partes_patrimonio(resumen_dashboard(e, HOY), {"activos": 1, "inversiones": 1})
    por_id = {p["id"]: p for p in partes}
    assert por_id["activos"]["detalle"] == "1 activo"
    assert por_id["inversiones"]["detalle"] == "+$100k (+10,0%)"
    assert por_id["deudas"]["detalle"] == "$50.000/mes · 1 deuda"
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
