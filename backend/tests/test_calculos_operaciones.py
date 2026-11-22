import datetime

import pytest

from backend.calculos import operaciones as op

D = datetime.date


def fecha(s):
    return datetime.date.fromisoformat(s)


def proxima(inicio, frec, hoy):
    return op.proxima_fecha_recurrente(inicio, frec, fecha(hoy))


def deuda(id=1, nombre="Deuda", saldo_actual=100, cuota_mensual=10, proxima_cuota="", **kw):
    return {"id": id, "nombre": nombre, "saldo_actual": saldo_actual, "cuota_mensual": cuota_mensual,
            "proxima_cuota": proxima_cuota, "monto_inicial": 1000, "total_intereses": 0, "tasa_ea": 0, **kw}


def inversion(id=1, nombre="Inv", **kw):
    return {"id": id, "nombre": nombre, "tipo": "fija", "pago": "mensual", "dia_pago": 20, "tasa_ea": 12,
            "monto_invertido": 1_000_000, "valor_actual": 1_000_000, **kw}


def recurrente(id=1, nombre="Rec", **kw):
    return {"id": id, "nombre": nombre, "tipo": "gasto", "monto": 100, "frecuencia": "mensual",
            "fecha_inicio": "2026-01-18", "activo": 1, **kw}


def test_pago_que_cae_hoy_es_hoy():
    assert proxima("2026-08-01", "mensual", "2026-08-01") == D(2026, 8, 1)


def test_dia_del_mes_se_mantiene_y_recorta():
    assert proxima("2026-01-31", "mensual", "2026-02-05") == D(2026, 2, 28)
    assert proxima("2026-01-31", "mensual", "2026-03-01") == D(2026, 3, 31)
    assert proxima("2026-01-31", "mensual", "2026-02-10") == D(2026, 2, 28)


def test_inicio_a_futuro_devuelve_el_inicio():
    assert proxima("2026-12-10", "mensual", "2026-08-01") == D(2026, 12, 10)


def test_semanal_y_quincenal():
    assert proxima("2026-07-28", "semanal", "2026-08-01") == D(2026, 8, 4)
    assert proxima("2026-08-01", "semanal", "2026-08-01") == D(2026, 8, 1)
    assert proxima("2026-07-20", "quincenal", "2026-08-01") == D(2026, 8, 3)
    assert proxima("2026-06-01", "semanal", "2026-06-09") == D(2026, 6, 15)


def test_anual():
    assert proxima("2025-03-10", "anual", "2026-08-01") == D(2027, 3, 10)
    assert proxima("2025-10-10", "anual", "2026-08-01") == D(2026, 10, 10)


def test_resultado_nunca_en_el_pasado():
    hoy = D(2026, 8, 1)
    for frec in op.FRECUENCIAS:
        for inicio in ["2020-01-01", "2024-02-29", "2026-07-31", "2026-08-01"]:
            assert op.proxima_fecha_recurrente(inicio, frec, hoy) >= hoy


def test_frecuencia_desconocida_o_fecha_vacia():
    assert proxima("", "mensual", "2026-08-01") is None
    assert proxima("2026-08-01", "cada rato", "2026-08-01") is None


def test_to_mensual():
    assert op.to_mensual(100, "mensual") == 100
    assert op.to_mensual(100, "quincenal") == 200
    assert op.to_mensual(1200, "anual") == 100
    assert op.to_mensual(100, "loquesea") == 100


def test_derivar_recurrente():
    d = op.derivar_recurrente(recurrente(fecha_inicio="2026-01-15"), D(2026, 8, 1))
    assert d["proximo_pago"] == {"fecha": "2026-08-15", "dias": 14, "texto": "en 14d"}
    assert d["activo"] is True and d["frecuencia_label"] == "Mensual" and d["mensual"] == 100
    assert op.derivar_recurrente(recurrente(fecha_inicio="2026-08-01"), D(2026, 8, 1))["proximo_pago"]["texto"] == "hoy"
    pausada = op.derivar_recurrente(recurrente(activo=0), D(2026, 8, 1))
    assert pausada["proximo_pago"] is None and pausada["activo"] is False
    assert op.derivar_recurrente(recurrente(frecuencia="x"), D(2026, 8, 1))["frecuencia_label"] == "x"


def test_ea_y_mv_son_inversas():
    assert op.mv_a_ea(op.ea_a_mv(12.5)) == pytest.approx(12.5, abs=1e-9)
    assert op.ea_a_mv(0) == 0


def test_tasa_ea_desde_input():
    assert op.tasa_ea_desde_input("12", "ea") == 12
    assert op.tasa_ea_desde_input(1, "mv") == pytest.approx(op.mv_a_ea(1))
    assert op.tasa_ea_desde_input("", "ea") is None
    assert op.tasa_ea_desde_input("0", "ea") is None
    assert op.tasa_ea_desde_input(None, "ea") is None


def test_proxima_fecha_inversion():
    h = D(2026, 8, 15)
    assert op.proxima_fecha_inversion(15, h) == h
    assert op.proxima_fecha_inversion(20, h) == D(2026, 8, 20)
    assert op.proxima_fecha_inversion(10, h) == D(2026, 9, 10)


def test_proxima_fecha_inversion_recorta_dia_31():
    assert op.proxima_fecha_inversion(31, D(2026, 2, 10)) == D(2026, 2, 28)
    assert op.proxima_fecha_inversion(31, D(2026, 4, 30)) == D(2026, 4, 30)
    assert op.proxima_fecha_inversion(30, D(2026, 1, 31)) == D(2026, 2, 28)


def test_derivar_inversion_proximo_pago():
    h = D(2026, 8, 15)
    assert op.derivar_inversion(inversion(dia_pago=15), h)["proximo_pago"]["texto"] == "hoy"
    assert op.derivar_inversion(inversion(dia_pago=20), h)["proximo_pago"]["texto"] == "en 5d"
    assert op.derivar_inversion(inversion(dia_pago=10), h)["proximo_pago"]["texto"] == "en 26d"
    assert op.derivar_inversion(inversion(dia_pago=None), h)["proximo_pago"] is None
    assert op.derivar_inversion(inversion(dia_pago=31), D(2026, 2, 28))["proximo_pago"]["texto"] == "hoy"
    assert op.derivar_inversion(inversion(dia_pago=31), D(2026, 4, 30))["proximo_pago"]["texto"] == "hoy"


def test_rendimiento_mensual_fija_redondea_a_pesos():
    assert op.rendimiento_mensual_fija(1_000_000, 12) == 9_489
    assert isinstance(op.rendimiento_mensual_fija(1_000_000, 12), int)


def test_cambio_valor():
    assert op.cambio_valor(1_100, 1_050, 1_000) == {"delta": 50, "total": 100, "total_pct": 10}
    assert op.cambio_valor(500, 600, 0) == {"delta": -100, "total": 500, "total_pct": 0}


def test_estimar_intereses_sin_datos_o_sin_pagos():
    assert op.estimar_intereses_pagados(1000, 1000, 20, 100) is None
    assert op.estimar_intereses_pagados(1000, 500, 0, 100) is None
    assert op.estimar_intereses_pagados(0, 0, 20, 100) is None


def test_estimar_intereses_amortiza_mes_a_mes():
    r = op.estimar_intereses_pagados(1_000_000, 500_000, 24, 100_000)
    assert isinstance(r, int) and r > 0


def test_estimar_intereses_corta_si_la_cuota_no_cubre_el_interes():
    assert op.estimar_intereses_pagados(1_000_000, 900_000, 60, 1_000) == 0


def test_intereses_pagados_exacto_o_estimado():
    base = {"monto_inicial": 1_000_000, "saldo_actual": 500_000, "tasa_ea": 24, "cuota_mensual": 100_000}
    assert op.intereses_pagados({**base, "total_intereses": 42_000}) == {"valor": 42_000, "exacto": True}
    est = op.intereses_pagados({**base, "total_intereses": 0})
    assert est["exacto"] is False
    assert op.fmt_intereses({"valor": 42_000, "exacto": True}, "$42.000") == "$42.000"
    assert op.fmt_intereses({"valor": 42_000, "exacto": False}, "$42.000") == "~$42.000"
    assert op.intereses_pagados({**base, "saldo_actual": 1_000_000, "total_intereses": 0}) is None


def test_desglose_pago():
    assert op.desglose_pago(1_000_000, 150_000, 900_000) == {"capital": 100_000, "intereses": 50_000}
    assert op.desglose_pago(1_000_000, 50_000, 900_000) == {"capital": 100_000, "intereses": 0}
    assert op.desglose_pago(100, 50, 200) == {"capital": 0, "intereses": 50}


def test_comision_adelanto():
    assert op.comision_adelanto(1_000_000, 500_000, 1_520_000) == 20_000
    assert op.comision_adelanto(1_000_000, 500_000, 1_500_000) == 0
    assert op.comision_adelanto(1_000_000, 500_000, 1_400_000) == 0


def test_derivar_deuda_y_tarjeta():
    d = op.derivar_deuda(deuda(saldo_actual=250, monto_inicial=1000, cuota_mensual=100))
    assert d["activa"] and d["vigente"] and d["progreso_pct"] == 75 and d["capital_pagado"] == 750
    assert d["meses_restantes"] == 3 and d["nivel_progreso"] == "alto" and d["disponible"] is None
    t = op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=0, cupo=1000, cuota_mensual=0))
    assert t["vigente"] and not t["activa"] and t["disponible"] == 1000 and t["uso_pct"] == 0
    assert t["meses_restantes"] is None and t["nivel_uso"] == "bajo"
    assert op.derivar_deuda(deuda(es_tarjeta=1, saldo_actual=950, cupo=1000))["nivel_uso"] == "alto"


def test_derivar_activo():
    a = op.derivar_activo({"valor_inicial": 1000, "valor_actual": 1100, "valor_actualizado_en": ""}, D(2026, 8, 1))
    assert a["cambio"] == 100 and a["cambio_pct"] == pytest.approx(10) and a["desactualizado"] is False


def test_derivar_inversion_ganancia():
    i = op.derivar_inversion(inversion(valor_actual=1_100_000, pago="vencimiento"), D(2026, 8, 1))
    assert i["ganancia"] == 100_000 and i["ganancia_pct"] == pytest.approx(10)
    assert i["proximo_pago"] is None and i["tasa_mv"] == pytest.approx(op.ea_a_mv(12))
    assert i["rendimiento_esperado"] == op.rendimiento_mensual_fija(1_100_000, 12)


def test_clave_op():
    assert op.clave_op("deuda", 3, "2026-08-20") == "deuda:3:2026-08-20"


HOY = D(2026, 8, 15)


def candidatas_mixtas():
    return op.calcular_proximas_operaciones(
        [
            deuda(1, "Carro", 5_000_000, 400_000, "2026-08-25"),
            deuda(2, "Saldada", 0, 10, "2026-08-20"),
            deuda(3, "Muy vieja", 100, 1, "2026-07-01"),
            deuda(4, "Vencida", 100_000, 10, "2026-08-10"),
        ],
        [
            inversion(5, "CDT"),
            inversion(6, "Sin pago", pago="vencimiento"),
        ],
        [
            recurrente(7, "Netflix", monto=30_000, fecha_inicio="2026-01-18"),
            recurrente(8, "Sueldo", tipo="ingreso", monto=5_000_000, frecuencia="quincenal", fecha_inicio="2026-08-01"),
            recurrente(9, "Pausado", activo=0),
        ],
        HOY,
    )


def test_proximas_juntan_ventana_y_orden():
    ops = candidatas_mixtas()
    assert [o["clave"] for o in ops] == [
        "deuda:4:2026-08-10",
        "recurrente:8:2026-08-15",
        "recurrente:7:2026-08-18",
        "inversion:5:2026-08-20",
        "deuda:1:2026-08-25",
    ]
    por = {o["clave"]: o["monto"] for o in ops}
    assert por["deuda:1:2026-08-25"] == -400_000
    assert por["recurrente:8:2026-08-15"] == 5_000_000
    assert por["inversion:5:2026-08-20"] == 9_489


def test_armar_proximas_filtra_ocultas_y_arma_textos():
    ops = candidatas_mixtas()
    r = op.armar_proximas(ops, {"deuda:1:2026-08-25", "deuda:9:2026-01-01"}, HOY)
    assert [i["clave"] for i in r["items"]] == [
        "deuda:4:2026-08-10",
        "recurrente:8:2026-08-15",
        "recurrente:7:2026-08-18",
        "inversion:5:2026-08-20",
    ]
    assert r["hoy"] == "2026-08-15"
    assert r["vencidas"] == 1
    assert r["salen_total"] == 10 + 30_000
    primero, segundo = r["items"][0], r["items"][1]
    assert primero["texto_dias"] == "vencido 5d" and primero["vencida"] is True
    assert segundo["texto_dias"] == "hoy" and segundo["dia"] == 15 and segundo["mes_corto"] == "ago."
    assert segundo["sub"] == "Quincenal" and primero["sub"] == "Cuota deuda"
    assert r["items"][2]["texto_dias"] == "en 3d"


def test_claves_vigentes_incluye_ocultas():
    assert "deuda:1:2026-08-25" in op.claves_vigentes(candidatas_mixtas())
    assert op.claves_vigentes([]) == set()


def test_armar_proximas_manana():
    ops = op.calcular_proximas_operaciones([deuda(1, proxima_cuota="2026-08-16")], [], [], HOY)
    assert op.armar_proximas(ops, set(), HOY)["items"][0]["texto_dias"] == "mañana"


def test_inversion_dia_31_en_febrero_cae_el_28():
    ops = op.calcular_proximas_operaciones([], [inversion(5, dia_pago=31)], [], D(2026, 2, 10))
    assert [o["clave"] for o in ops] == ["inversion:5:2026-02-28"]


def test_operaciones_proximas_ventana_de_un_dia():
    deudas = [deuda(1, "Credito", 100, 100_000, "2026-08-16"), deuda(2, "Vieja", 100, 1, "2026-08-14")]
    recs = [recurrente(2, "Salario", tipo="ingreso", monto=3_000_000, fecha_inicio="2026-07-15")]
    ops = op.operaciones_proximas(deudas, [inversion(3, dia_pago=20)], recs, HOY)
    assert ops == [(D(2026, 8, 15), "Salario", 3_000_000), (D(2026, 8, 16), "Credito", -100_000)]
    assert len(op.operaciones_proximas(deudas, [inversion(3, dia_pago=20)], recs, HOY, dias=5)) == 3
