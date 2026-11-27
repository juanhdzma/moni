import pytest

from backend.calculos.dinero.resumen import este_mes, frase_mes, partes_patrimonio, resumen_dashboard

from ..builders_calculos import HOY, activo, deuda, estado, inversion, tx


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


def _estado_completo():
    return estado(
        transacciones=[
            tx("ingreso", "Salario", 5_000_000, fecha="2026-07-10", id=1),
            tx("gasto", "Mercado", 300_000, fecha="2026-08-02", id=2),
            tx("gasto", "Ropa", 100_000, fecha="2026-08-04", tarjeta_id=1, id=3),
            tx("transfer", "Pago deuda", 50_000, fecha="2026-08-05", id=4),
        ],
        deudas=[deuda(500_000, 50_000), deuda(0.2, 9), deuda(0, 70_000, es_tarjeta=True)],
        inversiones=[inversion(1_100_000, 1_000_000, "2026-05-01")],
        activos=[activo(2_000_000)],
    )


def test_frase_mes_cubre_los_tres_casos_y_sus_bordes():
    assert frase_mes(0, 0) == {"tipo": "sin_ingresos", "texto": "Todavía no entró plata este mes.",
                               "partes": [{"texto": "Todavía no entró plata este mes.", "tono": None}]}
    assert frase_mes(0, -5)["tipo"] == "sin_ingresos"
    assert frase_mes(50, 1)["tipo"] == "quedo"
    assert frase_mes(75, 1000) == {
        "tipo": "quedo", "pct": 75, "texto": "Te quedó el 75,0% de lo que entró.",
        "partes": [{"texto": "Te quedó el ", "tono": None}, {"texto": "75,0%", "tono": "positivo"},
                   {"texto": " de lo que entró.", "tono": None}],
    }
    assert frase_mes(0, 1000) == {
        "tipo": "quedo", "pct": 0, "texto": "Te quedó el 0,0% de lo que entró.",
        "partes": [{"texto": "Te quedó el ", "tono": None}, {"texto": "0,0%", "tono": "positivo"},
                   {"texto": " de lo que entró.", "tono": None}],
    }
    assert frase_mes(-25, 1000) == {
        "tipo": "excedio", "pct": 25, "texto": "Salió 25,0% más de lo que entró.",
        "partes": [{"texto": "Salió ", "tono": None}, {"texto": "25,0%", "tono": "negativo"},
                   {"texto": " más de lo que entró.", "tono": None}],
    }


def test_este_mes_cuando_se_gasto_mas_de_lo_que_entro():
    e = estado(transacciones=[tx("ingreso", "Salario", 1_000, fecha="2026-08-02"), tx("gasto", "Mercado", 1_250, fecha="2026-08-03")])
    r = este_mes(e, HOY)
    assert r["quedo"] == -250 and r["tono_quedo"] == "negativo"
    assert r["frase"]["tipo"] == "excedio" and r["frase"]["pct"] == 25
    assert r["frase"]["texto"] == "Salió 25,0% más de lo que entró."


def test_resumen_dashboard_objeto_completo():
    assert resumen_dashboard(_estado_completo(), HOY) == {
        "patrimonio": 7_250_000, "patrimonio_tono": "positivo", "patrimonio_signo": "+", "efectivo": 4_650_000, "total_deuda": 500_000, "total_inv": 1_100_000,
        "total_activos": 2_000_000, "proy_delta": 4_600_000.0, "proy_delta_tono": "positivo", "proy_delta_signo": "+", "texto_proyeccion": "proyectados en 12 meses",
        "cuota_total": 120_000, "deudas_activas": 2, "total_invertido": 1_000_000, "ganancia_inv": 100_000,
        "ganancia_inv_pct": 10.0, "total_barra": 2_000_000 + 1_100_000 + 4_650_000 + 500_000,
    }


def test_total_barra_suma_valores_absolutos_con_efectivo_y_ganancia_negativos():
    e = estado(
        transacciones=[tx("gasto", "Mercado", 300, fecha="2026-08-02")],
        deudas=[deuda(500, 10)], inversiones=[inversion(40, 100)], activos=[activo(7)],
    )
    r = resumen_dashboard(e, HOY)
    assert r["efectivo"] == -300 and r["ganancia_inv"] == -60 and r["ganancia_inv_pct"] == -60
    assert r["total_barra"] == 7 + 40 + 300 + 500


def test_partes_patrimonio_lista_completa():
    partes = partes_patrimonio(resumen_dashboard(_estado_completo(), HOY), {"activos": 1, "inversiones": 1})
    assert partes == [
        {"id": "activos", "nombre": "Activos", "valor": 2_000_000, "valor_firmado": 2_000_000, "valor_signo": "+", "proporcion": pytest.approx(2_000_000 / 8_250_000 * 100), "negativo": False,
         "detalle": "1 activo", "tono": "activos"},
        {"id": "inversiones", "nombre": "Inversiones", "valor": 1_100_000, "valor_firmado": 1_100_000, "valor_signo": "+", "proporcion": pytest.approx(1_100_000 / 8_250_000 * 100), "negativo": False,
         "detalle": "+$100k (+10,0%)", "tono": "inversiones"},
        {"id": "balance", "nombre": "Cartera", "valor": 4_650_000, "valor_firmado": 4_650_000, "valor_signo": "+", "proporcion": pytest.approx(4_650_000 / 8_250_000 * 100), "negativo": False,
         "detalle": "Efectivo y cuentas", "tono": "cartera"},
        {"id": "deudas", "nombre": "Deudas", "valor": 500_000, "valor_firmado": -500_000, "valor_signo": "−", "proporcion": pytest.approx(500_000 / 8_250_000 * 100), "negativo": True,
         "detalle": "$120.000/mes · 2 deudas", "tono": "deudas"},
    ]


def _resumen(**kw):
    base = {"total_activos": 0, "total_inv": 0, "efectivo": 0, "total_deuda": 0, "cuota_total": 0, "deudas_activas": 0,
            "total_invertido": 0, "ganancia_inv": 0, "ganancia_inv_pct": 0}
    return {**base, **kw}


CONTEOS = {"activos": 3, "inversiones": 1}


def test_cartera_en_cero_o_positiva_no_es_negativa_y_en_negativo_si():
    for efectivo in (0, 0.5, 1, 10):
        cartera = partes_patrimonio(_resumen(efectivo=efectivo), CONTEOS)[2]
        assert (cartera["negativo"], cartera["tono"], cartera["valor_firmado"]) == (False, "cartera", efectivo)
    cartera = partes_patrimonio(_resumen(efectivo=-0.5), CONTEOS)[2]
    assert (cartera["negativo"], cartera["tono"], cartera["valor"], cartera["valor_firmado"]) == (True, "deudas", -0.5, -0.5)
    assert partes_patrimonio(_resumen(efectivo=-300), CONTEOS)[2]["valor_firmado"] == -300


def test_detalle_de_inversiones_segun_ganancia():
    def detalle(**kw):
        return partes_patrimonio(_resumen(**kw), CONTEOS)[1]["detalle"]

    assert detalle(total_invertido=1000, total_inv=950, ganancia_inv=-50, ganancia_inv_pct=-5) == "−$50 (−5,0%)"
    assert detalle(total_invertido=1000, total_inv=1000, ganancia_inv=0, ganancia_inv_pct=0) == "+$0 (+0,0%)"
    assert detalle(total_invertido=10_000_000, ganancia_inv=2_500_000, ganancia_inv_pct=25) == "+$2,5M (+25,0%)"
    assert detalle(total_invertido=1, ganancia_inv=1, ganancia_inv_pct=100) == "+$1 (+100,0%)"
    assert detalle(total_invertido=0) == "1 posición"
    assert partes_patrimonio(_resumen(), {"activos": 3, "inversiones": 2})[1]["detalle"] == "2 posiciones"


def test_detalle_de_deudas_y_activos_con_simbolo():
    partes = partes_patrimonio(_resumen(cuota_total=50_000, deudas_activas=1), CONTEOS, "US$")
    assert partes[3]["detalle"] == "US$50.000/mes · 1 deuda" and partes[0]["detalle"] == "3 activos"
    assert partes_patrimonio(_resumen(total_invertido=1000, total_inv=1100, ganancia_inv=100, ganancia_inv_pct=10), CONTEOS, "€")[1]["detalle"] == "+€100 (+10,0%)"


def test_este_mes_objeto_completo():
    e = estado(transacciones=[
        tx("ingreso", "Salario", 4_000, fecha="2026-08-02"), tx("gasto", "Mercado", 1_000, fecha="2026-08-03"),
        tx("ingreso", "Salario", 2_000, fecha="2026-07-02"), tx("gasto", "Ropa", 500, fecha="2026-03-04", tarjeta_id=1),
    ])
    assert este_mes(e, HOY) == {
        "ingresos": 4_000, "gastos": 1_000, "gastos_firmado": -1_000, "quedo": 3_000,
        "tono_ingresos": "positivo", "tono_gastos": "deudas", "tono_quedo": "positivo",
        "signo_ingresos": "+", "signo_gastos": "−", "signo_quedo": "+",
        "titulo": "Este mes en tu cartera", "etiqueta_ingresos": "Entró", "etiqueta_gastos": "Salió",
        "titulo_quedo": "Te quedó", "texto_tarjeta": "Lo pagado con tarjeta no sale de la cartera.",
        "frase": frase_mes(75, 4_000), "descripcion_grafico": "Entró y salió por mes, últimos 6 meses",
        "meses": [{"mes": "mar.", "entro": 0, "salio": 0}, {"mes": "abr.", "entro": 0, "salio": 0},
                  {"mes": "may.", "entro": 0, "salio": 0}, {"mes": "jun.", "entro": 0, "salio": 0},
                  {"mes": "jul.", "entro": 2_000, "salio": 0}, {"mes": "ago.", "entro": 4_000, "salio": 1_000}],
    }


def test_este_mes_sin_movimientos_tiene_tonos_neutros():
    r = este_mes(estado(), HOY)
    assert (r["tono_ingresos"], r["tono_quedo"], r["quedo"], r["gastos_firmado"]) == ("neutro", "neutro", 0, 0)
