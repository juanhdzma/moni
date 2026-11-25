import datetime

import pytest

from backend.calculos import operaciones as op
from backend.calculos.base.errores import ErrorDeDominio
from backend.calculos.operaciones.proximas import sin_ocultas

from ..helpers_operaciones import D, deuda, inversion, recurrente


def test_clave_op():
    assert op.proximas.clave_op("deuda", 3, "2026-08-20") == "deuda:3:2026-08-20"


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
    r = op.armar_proximas(sin_ocultas(ops, {"deuda:1:2026-08-25", "deuda:9:2026-01-01"}), HOY)
    assert [i["clave"] for i in r["items"] + r["extra"]] == [
        "deuda:4:2026-08-10",
        "recurrente:8:2026-08-15",
        "recurrente:7:2026-08-18",
        "inversion:5:2026-08-20",
    ]
    assert r["extra"] == [] and r["texto_ver_todas"] is None
    assert r["hoy"] == "2026-08-15"
    assert "vencidas" not in r and "visibles" not in r and "dias" not in r["items"][0]
    assert "salen_total" not in r and "dias_ventana" not in r
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
    assert op.armar_proximas(ops, HOY)["items"][0]["texto_dias"] == "mañana"


def test_inversion_dia_31_en_febrero_cae_el_28():
    ops = op.calcular_proximas_operaciones([], [inversion(5, dia_pago=31)], [], D(2026, 2, 10))
    assert [o["clave"] for o in ops] == ["inversion:5:2026-02-28"]


def test_armar_proximas_frase_con_y_sin_vencidas():
    r = op.armar_proximas(candidatas_mixtas(), HOY)
    assert r["frase"]["texto"] == "Tenés 1 pago vencido y $430.010 por pagar en 45 días."
    assert [p["tono"] for p in r["frase"]["partes"]] == [None, "negativo", None, "fuerte", None]
    sin_vencidas = op.calcular_proximas_operaciones([deuda(1, cuota_mensual=70_000, proxima_cuota="2026-08-20")], [], [], HOY)
    assert op.armar_proximas(sin_vencidas, HOY, "US$")["frase"]["texto"] == "US$70.000 por pagar en los próximos 45 días."


def test_armar_proximas_plural_vencidas_y_vacio():
    ops = op.calcular_proximas_operaciones(
        [deuda(1, proxima_cuota="2026-08-10"), deuda(2, proxima_cuota="2026-08-11")], [], [], HOY
    )
    assert "2 pagos vencidos" in op.armar_proximas(ops, HOY)["frase"]["texto"]
    vacio = op.armar_proximas([], HOY)
    assert vacio["frase"] is None and vacio["items"] == []
    assert vacio["texto_vacio"] == "Sin operaciones en los próximos 45 días."


def test_armar_proximas_corta_a_20_pero_cuenta_todas():
    deudas = [deuda(i, proxima_cuota="2026-08-20") for i in range(1, 26)]
    r = op.armar_proximas(op.calcular_proximas_operaciones(deudas, [], [], HOY), HOY)
    assert len(r["items"]) == 5 and len(r["extra"]) == 15
    assert r["texto_ver_todas"] == "Ver las 20" and r["texto_ver_menos"] == "Ver menos"
    assert r["items"][0]["clave"] != r["extra"][0]["clave"]


def test_armar_proximas_marca_sin_monto_y_oculta_ver_menos_si_no_hay_extra():
    ops = op.calcular_proximas_operaciones([deuda(1, cuota_mensual=0, proxima_cuota="2026-08-20")], [], [], HOY)
    r = op.armar_proximas(ops, HOY)
    assert r["items"][0]["sin_monto"] is True
    assert r["texto_ver_menos"] is None


def test_rendimiento_proximo_usa_valor_actual_igual_que_la_ficha():
    inv = inversion(5, monto_invertido=1_000_000, valor_actual=1_200_000)
    ops = op.calcular_proximas_operaciones([], [inv], [], HOY)
    assert ops[0]["monto"] == 11_387 == op.derivar_inversion(inv, HOY)["rendimiento_esperado"]


def test_recurrente_sin_limite_de_vencida_y_deuda_vieja_fuera():
    ops = op.calcular_proximas_operaciones(
        [deuda(1, proxima_cuota="2026-08-04"), deuda(2, proxima_cuota="2026-08-05")], [], [recurrente(3, fecha_inicio="2020-01-01")], HOY
    )
    assert [o["clave"] for o in ops] == ["deuda:2:2026-08-05", "recurrente:3:2026-09-01"]


def _claves(deudas=(), invs=(), recs=(), hoy=HOY):
    return [o["clave"] for o in op.calcular_proximas_operaciones(list(deudas), list(invs), list(recs), hoy)]


def test_deuda_en_el_borde_inferior_de_la_ventana():
    assert _claves([deuda(1, proxima_cuota="2026-08-05")]) == ["deuda:1:2026-08-05"]
    assert _claves([deuda(1, proxima_cuota="2026-08-04")]) == []


def test_deuda_y_recurrente_en_el_borde_superior_de_la_ventana():
    assert _claves([deuda(1, proxima_cuota="2026-09-29")]) == ["deuda:1:2026-09-29"]
    assert _claves([deuda(1, proxima_cuota="2026-09-30")]) == []
    assert _claves(recs=[recurrente(2, frecuencia="anual", fecha_inicio="2026-09-29")]) == ["recurrente:2:2026-09-29"]
    assert _claves(recs=[recurrente(2, frecuencia="anual", fecha_inicio="2026-09-30")]) == []


def test_deuda_sin_saldo_o_sin_fecha_o_con_fecha_invalida_no_genera_operacion():
    assert _claves([deuda(1, saldo_actual=0.5, proxima_cuota="2026-08-20")]) == []
    assert _claves([deuda(1, saldo_actual=1, proxima_cuota="2026-08-20")]) == ["deuda:1:2026-08-20"]
    assert _claves([deuda(1, proxima_cuota="")]) == [] and _claves([deuda(1, proxima_cuota="basura")]) == []


def test_inversion_exige_fija_mensual_con_dia_y_tasa():
    assert _claves(invs=[inversion(1)]) == ["inversion:1:2026-08-20"]
    for cambio in ({"tipo": "variable"}, {"pago": "vencimiento"}, {"dia_pago": None}, {"tasa_ea": 0}, {"tasa_ea": None}):
        assert _claves(invs=[inversion(1, **cambio)]) == []


def test_recurrente_pausada_o_sin_fecha_no_genera_operacion():
    assert _claves(recs=[recurrente(1, fecha_inicio="")]) == [] and _claves(recs=[recurrente(1, activo=0)]) == []
    assert _claves(recs=[recurrente(1, tipo="ingreso", monto=50, fecha_inicio="2026-08-20")]) == ["recurrente:1:2026-08-20"]


def test_candidato_completo():
    [o] = op.calcular_proximas_operaciones([deuda(1, "Carro", 100, 40, "2026-08-20")], [], [], HOY)
    assert o == {"fecha": D(2026, 8, 20), "fecha_iso": "2026-08-20", "etiqueta": "Carro", "sub": "Cuota deuda", "monto": -40,
                 "tipo": "deuda", "fuente_id": 1, "clave": "deuda:1:2026-08-20"}


def test_parse_clave_valida():
    assert op.proximas.parse_clave("deuda:3:2026-08-20") == ("deuda", 3, "2026-08-20")
    assert op.proximas.parse_clave("inversion:12:2026-01-31") == ("inversion", 12, "2026-01-31")
    assert op.proximas.parse_clave("recurrente:7:2026-02-28") == ("recurrente", 7, "2026-02-28")
    assert op.proximas.FUENTES_OPS == {"deuda": "deudas", "inversion": "inversiones", "recurrente": "recurrentes"}


@pytest.mark.parametrize("mala", ["", None, "mal", "otro:1:2026-08-20", "deuda:x:2026-08-20", "deuda:1:2026-13-45",
                                  "deuda:1:2026-02-30", "deuda:1:2026-08-20:extra", "xdeuda:1:2026-08-20", "deuda:1:2026-08-2"])
def test_parse_clave_invalida_con_mensaje_exacto(mala):
    with pytest.raises(ErrorDeDominio) as e:
        op.proximas.parse_clave(mala)
    assert e.value.mensaje == "clave de operación inválida" and e.value.status == 400


def test_en_ventana_incluye_hoy_y_el_ultimo_dia():
    cands = [{"fecha": HOY + datetime.timedelta(days=d), "clave": str(d)} for d in (-1, 0, 1, 5, 6)]
    assert [c["clave"] for c in op.proximas.en_ventana(cands, HOY, 5)] == ["0", "1", "5"]
    assert op.proximas.en_ventana(cands, HOY, 0) == [cands[1]]


def test_total_por_pagar_solo_suma_salidas():
    ops = op.calcular_proximas_operaciones(
        [deuda(1, cuota_mensual=100, proxima_cuota="2026-08-20")], [],
        [recurrente(2, tipo="ingreso", monto=0.9, fecha_inicio="2026-08-21"), recurrente(3, monto=0, fecha_inicio="2026-08-22")], HOY,
    )
    assert op.armar_proximas(ops, HOY)["frase"]["texto"] == "$100 por pagar en los próximos 45 días."
