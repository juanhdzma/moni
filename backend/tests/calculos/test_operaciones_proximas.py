from backend.calculos import operaciones as op

from .helpers_operaciones import D, deuda, inversion, recurrente


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


def test_armar_proximas_frase_con_y_sin_vencidas():
    r = op.armar_proximas(candidatas_mixtas(), set(), HOY)
    assert r["frase"]["texto"] == "Tenés 1 pago vencido y $430.010 por pagar en 45 días."
    assert [p["tono"] for p in r["frase"]["partes"]] == [None, "negativo", None, "fuerte", None]
    sin_vencidas = op.calcular_proximas_operaciones([deuda(1, cuota_mensual=70_000, proxima_cuota="2026-08-20")], [], [], HOY)
    assert op.armar_proximas(sin_vencidas, set(), HOY, "US$")["frase"]["texto"] == "US$70.000 por pagar en los próximos 45 días."


def test_armar_proximas_plural_vencidas_y_vacio():
    ops = op.calcular_proximas_operaciones(
        [deuda(1, proxima_cuota="2026-08-10"), deuda(2, proxima_cuota="2026-08-11")], [], [], HOY
    )
    assert "2 pagos vencidos" in op.armar_proximas(ops, set(), HOY)["frase"]["texto"]
    vacio = op.armar_proximas([], set(), HOY)
    assert vacio["frase"] is None and vacio["dias_ventana"] == 45
    assert vacio["texto_vacio"] == "Sin operaciones en los próximos 45 días."


def test_armar_proximas_corta_a_20_pero_cuenta_todas():
    deudas = [deuda(i, proxima_cuota="2026-08-20") for i in range(1, 26)]
    r = op.armar_proximas(op.calcular_proximas_operaciones(deudas, [], [], HOY), set(), HOY)
    assert len(r["items"]) == 20 and r["visibles"] == 5
