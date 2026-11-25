import pytest

from backend.calculos.dinero.resumen import este_mes, evolucion, partes_patrimonio, resumen_dashboard

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
    assert not {"ingresos_mes", "gastos_mes", "quedo_mes", "ahorro_pct", "frase_mes"} & set(r)
    assert r["efectivo"] == 5_000_000 + 1_000_000 - 250_000
    assert r["deudas_activas"] == 1
    assert r["cuota_total"] == 50_000
    assert r["ganancia_inv"] == 100_000
    assert r["ganancia_inv_pct"] == pytest.approx(10)
    mes = este_mes(e, HOY)
    assert mes["frase"]["tipo"] == "quedo" and mes["frase"]["pct"] == 75
    assert mes["frase"]["texto"] == "Te quedó el 75,0% de lo que entró."


def test_resumen_dashboard_sin_ingresos_no_divide_por_cero():
    r = resumen_dashboard(estado(), HOY)
    assert r["ganancia_inv_pct"] == 0
    assert r["proy_delta"] == 0
    frase = este_mes(estado(), HOY)["frase"]
    assert frase["tipo"] == "sin_ingresos"
    assert frase["texto"] == "Todavía no entró plata este mes."


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
    assert por_id["deudas"]["valor_firmado"] == -500_000 and por_id["activos"]["valor_firmado"] > 0
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
    assert r["puntos"][-1]["valor"] == 5_000_000 - 300_000 + 1_500_000
    assert r["frase"]["texto"].startswith("Subiste") and "desde fin de jun.:" in r["frase"]["texto"]
    assert r["descripcion_grafico"] == "Evolución mensual de patrimonio"
    inv = evolucion(e, "inversiones", "1M", HOY)
    assert inv["descripcion_grafico"] == "Evolución mensual de inversiones"
    assert inv["puntos"][-1]["valor"] == 1_500_000
    assert inv["frase"]["texto"].startswith("Te mantuviste en inversiones")


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
    assert r["frase"]["pct"] == 75
    assert len(r["meses"]) == 6
    assert r["meses"][-1] == {"mes": "ago.", "entro": 4_000, "salio": 1_000}
    assert r["meses"][-2]["salio"] == 700


def test_cartera_negativa_se_firma_negativa_y_deudas_siempre_negativas():
    e = estado(transacciones=[tx("gasto", "Mercado", 300_000, fecha="2026-08-02")], deudas=[deuda(500_000, 50_000)])
    por_id = {p["id"]: p for p in partes_patrimonio(resumen_dashboard(e, HOY), {"activos": 0, "inversiones": 0})}
    assert por_id["balance"]["negativo"] is True and por_id["balance"]["valor_firmado"] == -300_000


def test_quedo_del_mes_descuenta_transfers_igual_que_el_porcentaje():
    e = estado(
        transacciones=[
            tx("ingreso", "Salario", 1_000, fecha="2026-08-02"),
            tx("gasto", "Mercado", 200, fecha="2026-08-03"),
            tx("gasto", "Ropa", 300, fecha="2026-08-04", tarjeta_id=1),
            tx("transfer", "Pago deuda", 100, fecha="2026-08-05"),
        ]
    )
    r = este_mes(e, HOY)
    assert r["quedo"] == 700 and r["frase"]["pct"] == 70
    assert r["gastos_firmado"] == -200
    assert (r["tono_ingresos"], r["tono_gastos"], r["tono_quedo"]) == ("positivo", "deudas", "positivo")


def test_deudas_vigentes_unico_predicado_en_dashboard():
    e = estado(deudas=[deuda(0, 0, es_tarjeta=True), deuda(0.2, 9), deuda(500, 50)])
    r = resumen_dashboard(e, HOY)
    assert r["deudas_activas"] == 2 and r["cuota_total"] == 50 and r["total_deuda"] == 500


def test_partes_patrimonio_traen_tono_de_dominio():
    ok = {p["id"]: p["tono"] for p in partes_patrimonio(resumen_dashboard(estado(), HOY), {"activos": 0, "inversiones": 0})}
    assert ok == {"activos": "activos", "inversiones": "inversiones", "balance": "cartera", "deudas": "deudas"}
    e = estado(transacciones=[tx("gasto", "Mercado", 300, fecha="2026-08-02")])
    neg = {p["id"]: p["tono"] for p in partes_patrimonio(resumen_dashboard(e, HOY), {"activos": 0, "inversiones": 0})}
    assert neg["balance"] == "deudas"


def test_evolucion_trae_tono_de_serie():
    assert evolucion(estado(), "patrimonio", "3M", HOY)["tono"] == "cartera"
    assert evolucion(estado(), "inversiones", "3M", HOY)["tono"] == "inversiones"
