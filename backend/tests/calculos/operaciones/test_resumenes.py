from backend.calculos.operaciones import (
    con_categoria_sugerida,
    preview_venta_activo,
    resumen_activos,
    resumen_deudas,
    resumen_inversiones,
    resumen_recurrentes,
)
from backend.calculos.operaciones.textos import (
    texto_vacio_activos,
    texto_vacio_inversiones,
    texto_vacio_recurrentes,
)

VACIO_INV = texto_vacio_inversiones("inversiones fijas")


def fila_deuda(id, saldo, cuota, tarjeta=False, **kw):
    activa = saldo >= 1
    return {
        "id": id, "nombre": f"D{id}", "saldo_actual": saldo, "cuota_mensual": cuota, "es_tarjeta": tarjeta,
        "activa": activa, "vigente": tarjeta or activa, "monto_inicial": 1000, "total_intereses": 0, "tasa_ea": 0, **kw,
    }


def test_resumen_deudas_totales_y_listas():
    credito, tarjeta, saldada, tarjeta_en_cero = (
        fila_deuda(1, 600, 100), fila_deuda(2, 300, 50, True), fila_deuda(3, 0, 20), fila_deuda(4, 0, 30, True),
    )
    r = resumen_deudas([credito, tarjeta, saldada, tarjeta_en_cero])
    assert r == {
        "total": 900, "total_cuotas": 180, "total_intereses": 0, "intereses_aproximado": False,
        "segmentos": [{"key": "1", "label": "D1", "valor": 600}, {"key": "2", "label": "D2", "valor": 300}],
        "creditos": [credito], "tarjetas": [tarjeta, tarjeta_en_cero], "terminadas": [saldada],
    }


def test_resumen_deudas_suma_intereses_exactos_y_marca_aproximado_si_hay_estimados():
    exacto = fila_deuda(1, 100, 10, total_intereses=40)
    otro = fila_deuda(2, 50, 10, total_intereses=60)
    assert resumen_deudas([exacto, otro])["total_intereses"] == 100
    assert resumen_deudas([exacto, otro])["intereses_aproximado"] is False
    estimado = fila_deuda(3, 500, 100, monto_inicial=1000, tasa_ea=12)
    r = resumen_deudas([exacto, estimado])
    assert r["intereses_aproximado"] is True
    assert r["total_intereses"] == 40 + 44


def test_resumen_deudas_vacio():
    r = resumen_deudas([])
    assert r["total"] == 0 and r["intereses_aproximado"] is False and r["segmentos"] == []


def fila_inv(id, tipo, invertido, actual):
    return {"id": id, "nombre": f"I{id}", "tipo": tipo, "monto_invertido": invertido, "valor_actual": actual}


def test_resumen_inversiones_ganancia_positiva():
    fija, variable = fila_inv(1, "fija", 1000, 1300), fila_inv(2, "variable", 500, 450)
    r = resumen_inversiones([fija, variable])
    assert r == {
        "total_actual": 1750, "ganancia": 250, "ganancia_pct": (250 / 1500) * 100, "mostrar_ganancia": True,
        "texto_ganancia": "$250 (16,7%) ganado",
        "segmentos": [{"key": "1", "label": "I1", "valor": 1300}, {"key": "2", "label": "I2", "valor": 450}],
        "fijas": [fija], "variables": [variable], "texto_posiciones": "2 posiciones",
        "texto_vacio_fijas": VACIO_INV, "texto_vacio_variables": texto_vacio_inversiones("inversiones variables"),
    }


def test_resumen_inversiones_ganancia_cero_negativa_y_simbolo():
    assert resumen_inversiones([fila_inv(1, "fija", 1000, 1000)])["texto_ganancia"] == "$0 (0,0%) ganado"
    perdida = resumen_inversiones([fila_inv(1, "fija", 2000, 1500)], "US$")
    assert perdida["texto_ganancia"] == "US$500 (25,0%) perdido"
    assert perdida["ganancia"] == -500 and perdida["texto_posiciones"] == "1 posición"


def test_resumen_inversiones_sin_invertido_no_muestra_ganancia():
    assert resumen_inversiones([fila_inv(1, "fija", 0, 0)])["mostrar_ganancia"] is False
    assert resumen_inversiones([])["mostrar_ganancia"] is False
    assert resumen_inversiones([fila_inv(1, "fija", 1, 1)])["mostrar_ganancia"] is True


def test_segmentos_agrupan_en_otros_a_partir_del_sexto():
    filas = [fila_inv(i, "fija", 10, v) for i, v in enumerate([50, 40, 30, 20, 10, 5], start=1)]
    segmentos = resumen_inversiones(filas)["segmentos"]
    assert [s["valor"] for s in segmentos] == [50, 40, 30, 20, 15]
    assert segmentos[-1] == {"key": "__otros", "label": "Otros", "valor": 15}


def fila_activo(id, inicial, actual):
    return {"id": id, "nombre": f"A{id}", "valor_inicial": inicial, "valor_actual": actual}


def test_resumen_activos():
    a, b = fila_activo(1, 1000, 1200), fila_activo(2, 500, 400)
    r = resumen_activos([a, b])
    assert r == {
        "total_actual": 1600, "variacion": 100, "mostrar_variacion": True,
        "segmentos": [{"key": "1", "label": "A1", "valor": 1200}, {"key": "2", "label": "A2", "valor": 400}],
        "items": [a, b], "texto_variacion": "6,7% sobre lo pagado", "texto_conteo": "2 activos",
        "texto_vacio": texto_vacio_activos(),
    }


def test_resumen_activos_sin_valor_inicial_no_muestra_variacion():
    assert resumen_activos([fila_activo(1, 0, 0)])["mostrar_variacion"] is False
    assert resumen_activos([fila_activo(1, 1, 1)])["mostrar_variacion"] is True
    vacio = resumen_activos([])
    assert vacio["texto_variacion"] == "" and vacio["texto_conteo"] == "0 activos"


def test_preview_venta_activo():
    assert preview_venta_activo(fila_activo(1, 1000, 1200), 1500) == {"vs_inicial": 500, "vs_actual": 300}
    assert preview_venta_activo(fila_activo(1, 1000, 1200), 900) == {"vs_inicial": -100, "vs_actual": -300}


CATEGORIAS = {"gasto": [{"nombre": "Comida"}, {"nombre": "Otros"}], "ingreso": [{"nombre": "Salario"}, {"nombre": "Extra"}]}


def fila_rec(id, tipo, mensual, activo=True, nombre=None):
    return {"id": id, "nombre": nombre or f"R{id}", "tipo": tipo, "mensual": mensual, "activo": activo}


def test_con_categoria_sugerida():
    assert con_categoria_sugerida(fila_rec(1, "gasto", 10, nombre="Comida"), CATEGORIAS)["categoria_sugerida"] == "Comida"
    assert con_categoria_sugerida(fila_rec(1, "gasto", 10), CATEGORIAS)["categoria_sugerida"] == "Otros"


def test_resumen_recurrentes_ordena_por_monto_y_excluye_pausadas_de_los_totales():
    sueldo = fila_rec(1, "ingreso", 5000, nombre="Salario")
    arriendo, gym, pausado = fila_rec(2, "gasto", 2000), fila_rec(3, "gasto", 3000, nombre="Comida"), fila_rec(4, "gasto", 900, activo=False)
    r = resumen_recurrentes([sueldo, arriendo, gym, pausado], CATEGORIAS)
    assert r["neto_mensual"] == 5000 - 5000
    assert r["dato"]["texto"] == "entran $5.000 · salen $5.000 en fijos"
    assert [x["id"] for x in r["gastos"]] == [3, 2, 4]
    assert [x["id"] for x in r["ingresos"]] == [1]
    assert r["ingresos"][0]["categoria_sugerida"] == "Salario"
    assert r["gastos"][0]["categoria_sugerida"] == "Comida" and r["gastos"][1]["categoria_sugerida"] == "Otros"
    assert [s["key"] for s in r["segmentos"]] == ["3", "2"]
    assert r["texto_vacio_ingresos"] == texto_vacio_recurrentes("ingresos")
    assert r["texto_vacio_gastos"] == texto_vacio_recurrentes("gastos")


def test_resumen_recurrentes_simbolo_y_vacio():
    r = resumen_recurrentes([fila_rec(1, "ingreso", 100)], CATEGORIAS, "€")
    assert r["dato"]["texto"] == "entran €100 · salen €0 en fijos"
    vacio = resumen_recurrentes([], CATEGORIAS)
    assert vacio["neto_mensual"] == 0 and vacio["ingresos"] == [] and vacio["gastos"] == [] and vacio["segmentos"] == []
