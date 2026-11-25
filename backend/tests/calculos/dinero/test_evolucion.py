from backend.calculos.dinero.resumen import evolucion

from ..builders_calculos import HOY, activo, deuda, estado, inversion, tx


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

def test_evolucion_trae_tono_de_serie():
    assert evolucion(estado(), "patrimonio", "3M", HOY)["tono"] == "cartera"
    assert evolucion(estado(), "inversiones", "3M", HOY)["tono"] == "inversiones"

def test_evolucion_patrimonio_3_meses_objeto_completo():
    assert evolucion(_estado_completo(), "patrimonio", "3M", HOY) == {
        "serie": "patrimonio", "periodo": "3M", "meses": 3, "desde": 2_650_000, "cambio": 4_600_000,
        "nombre_serie": "Patrimonio", "tono": "cartera", "descripcion_grafico": "Evolución mensual de patrimonio",
        "puntos": [{"mes": "jun.", "valor": 2_650_000}, {"mes": "jul.", "valor": 7_650_000}, {"mes": "ago.", "valor": 7_250_000}],
        "frase": {
            "texto": "Subiste +$4,6M desde fin de jun.: de $2,6M a $7,2M.",
            "partes": [{"texto": "Subiste", "tono": None}, {"texto": " ", "tono": None}, {"texto": "+$4,6M", "tono": "positivo"},
                       {"texto": " desde fin de jun.: de $2,6M a ", "tono": None}, {"texto": "$7,2M", "tono": "fuerte"},
                       {"texto": ".", "tono": None}],
        },
    }

def test_evolucion_que_baja_usa_signo_menos_y_tono_negativo():
    r = evolucion(_estado_completo(), "patrimonio", "ALL", HOY)
    assert r["meses"] == 2 and r["desde"] == 7_650_000 and r["cambio"] == -400_000
    assert r["frase"]["texto"] == "Bajaste −$400k desde fin de jul.: de $7,7M a $7,2M."
    assert [p["tono"] for p in r["frase"]["partes"]] == [None, None, "negativo", None, "fuerte", None]

def test_evolucion_con_simbolo_y_periodos_fijos():
    assert "US$" in evolucion(_estado_completo(), "patrimonio", "3M", HOY, "US$")["frase"]["texto"]
    assert [evolucion(estado(), "patrimonio", p, HOY)["meses"] for p in ("3M", "6M", "1Y")] == [3, 6, 12]
    assert evolucion(estado(), "patrimonio", "ALL", HOY)["meses"] == 6

def test_evolucion_de_inversiones_sigue_aportes_y_retiros():
    e = estado(
        transacciones=[tx("gasto", "Inversión", 200_000, fecha="2026-07-05"), tx("ingreso", "Dividendos", 100_000, fecha="2026-08-05")],
        inversiones=[inversion(1_100_000, 1_000_000, "2026-05-01")],
    )
    r = evolucion(e, "inversiones", "ALL", HOY)
    assert r["meses"] == 4 and r["desde"] == 1_000_000 and r["cambio"] == 100_000
    assert [p["valor"] for p in r["puntos"]] == [1_000_000, 1_000_000, 1_200_000, 1_100_000]
    assert r["frase"]["texto"] == "Subiste +$100k en inversiones desde fin de may.: de $1,0M a $1,1M."
    assert (r["serie"], r["nombre_serie"], r["tono"]) == ("inversiones", "Inversiones", "inversiones")

def test_evolucion_all_cuenta_desde_la_fecha_mas_antigua_entre_transacciones_e_inversiones():
    viejo_tx = estado(transacciones=[tx("gasto", "A", 1, fecha="2026-03-10")], inversiones=[inversion(0, 0, "2026-06-01")])
    assert evolucion(viejo_tx, "inversiones", "ALL", HOY)["meses"] == 6
    viejo_inv = estado(transacciones=[tx("gasto", "A", 1, fecha="2026-06-10")], inversiones=[inversion(0, 0, "2026-03-01")])
    assert evolucion(viejo_inv, "inversiones", "ALL", HOY)["meses"] == 6
    assert evolucion(viejo_inv, "patrimonio", "ALL", HOY)["meses"] == 3
    sin_fecha = estado(transacciones=[tx("gasto", "A", 1, fecha="2026-06-10")], inversiones=[inversion(0, 0, None)])
    assert evolucion(sin_fecha, "inversiones", "ALL", HOY)["meses"] == 3

def test_evolucion_que_no_cambia_dice_te_mantuviste():
    r = evolucion(estado(), "patrimonio", "3M", HOY)
    assert r["cambio"] == 0 and r["frase"]["texto"] == "Te mantuviste desde fin de jun.: de $0 a $0."
    assert len(r["frase"]["partes"]) == 4


def test_evolucion_con_cambio_menor_a_un_peso_sigue_siendo_una_subida():
    r = evolucion(estado(transacciones=[tx("ingreso", "Salario", 0.5, fecha="2026-08-02")]), "patrimonio", "3M", HOY, "€")
    assert r["cambio"] == 0.5
    assert r["frase"]["texto"] == "Subiste +€1 desde fin de jun.: de €0 a €1."
    assert [p["tono"] for p in r["frase"]["partes"]] == [None, None, "positivo", None, "fuerte", None]


def test_evolucion_baja_con_simbolo_en_cambio_inicio_y_fin():
    r = evolucion(_estado_completo(), "patrimonio", "ALL", HOY, "£")
    assert r["frase"]["texto"] == "Bajaste −£400k desde fin de jul.: de £7,7M a £7,2M."
