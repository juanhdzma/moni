import datetime
import json
from pathlib import Path

import pytest

from backend.calculos import dinero, fechas, listados, operaciones
from backend.calculos.constantes import tiene_saldo
from backend.calculos.operaciones.finanzas import rendimiento_esperado

DATA = json.loads((Path(__file__).parent / "fixtures" / "parity.json").read_text())
HOY = datetime.date.fromisoformat(DATA["hoy"])
EXP = DATA["expected"]
DS = DATA["dataset"]


def _con_id(filas):
    return [dict(f, _id=f["id"]) for f in filas]


TXS = DS["transacciones"]
DEUDAS = DS["deudas"]
INVS = DS["inversiones"]
ACTIVOS = DS["activos"]
RECS = DS["recurrentes"]
ESTADO = {"transacciones": TXS, "deudas": [operaciones.derivar_deuda(d) for d in DEUDAS], "inversiones": INVS, "activos": ACTIVOS, "recurrentes": RECS}


def test_flujos_y_net_worth():
    assert dinero.flujo_cartera(TXS) == EXP["flujo_cartera"]
    assert dinero.flujo_patrimonio(TXS) == EXP["flujo_patrimonio"]
    assert dinero.net_worth(TXS, INVS, ACTIVOS, DEUDAS) == EXP["net_worth"]


def test_series_mensuales():
    for n, esperado in EXP["monthly_patrimonio"].items():
        assert dinero.monthly_patrimonio(TXS, int(n), HOY) == esperado
    for n, esperado in EXP["monthly_inv_delta"].items():
        assert dinero.monthly_inv_delta(TXS, int(n), HOY) == esperado
    assert dinero.serie_hacia_atras(1000000, dinero.monthly_patrimonio(TXS, 6, HOY)) == EXP["serie_hacia_atras"]


def test_etiquetas_meses():
    assert dinero.etiquetas_meses(14, HOY) == EXP["month_labels"]


def test_fechas_y_periodos():
    assert dinero.fechas_transacciones(TXS) == EXP["fechas_tx"]
    ft = dinero.fechas_transacciones(TXS)
    fi = dinero.fechas_inversiones(INVS)
    for periodo, (solo_tx, con_inv, vacio) in EXP["periodo_meses"].items():
        if periodo == "1M":
            continue
        assert dinero.meses_periodo(periodo, ft, HOY) == solo_tx
        assert dinero.meses_periodo(periodo, ft + fi, HOY) == con_inv
        assert dinero.meses_periodo(periodo, [], HOY) == vacio


def test_resumen_dashboard():
    r = dinero.resumen_dashboard(ESTADO, HOY)
    esperado = EXP["resumen_dashboard"]
    mes = {"ingresos_mes", "gastos_mes", "ahorro_pct"}
    redefinidos = {"deudas_activas", "cuota_total", "total_deuda"}
    vigentes = [d for d in ESTADO["deudas"] if d["vigente"]]
    assert r["deudas_activas"] == len(vigentes)
    assert r["cuota_total"] == sum(d["cuota_mensual"] for d in vigentes)
    assert r["total_deuda"] == sum(d["saldo_actual"] for d in vigentes)
    for k, v in esperado.items():
        if k in mes or k in redefinidos:
            continue
        assert r[k] == pytest.approx(v, rel=0, abs=1e-6) if isinstance(v, float) else r[k] == v, k
    assert mes.isdisjoint(r)
    este = dinero.este_mes(ESTADO, HOY)
    assert este["ingresos"] == esperado["ingresos_mes"]
    assert este["gastos"] == esperado["gastos_mes"]
    assert este["frase"]["pct"] == pytest.approx(esperado["ahorro_pct"], rel=0, abs=1e-6)


def test_movimientos_recientes():
    for n, ids in EXP["movimientos"].items():
        assert [t["id"] for t in dinero.movimientos_recientes(TXS, int(n))] == ids


@pytest.mark.parametrize("periodo", ["1W", "1M", "3M", "6M", "1Y", "ALL"])
def test_gastos(periodo):
    esperado = EXP["gastos"][periodo]
    assert [t["id"] for t in dinero.gastos_en_periodo(TXS, periodo, HOY)] == esperado["ids"]
    cats = dinero.agrupar_gastos(dinero.gastos_en_periodo(TXS, periodo, HOY))
    assert [[c["categoria"], c["valor"]] for c in cats] == esperado["entries"]
    for c in cats:
        assert [d["id"] for d in c["detalle"]] == esperado["detalle"][c["categoria"]]
        assert c["n"] == esperado["n"][c["categoria"]]
        assert (c["restantes_texto"] is None) == (esperado["n"][c["categoria"]] <= 6)


def test_proximas_operaciones():
    cands = operaciones.calcular_proximas_operaciones(DEUDAS, INVS, RECS, HOY)
    items = operaciones.armar_proximas(cands, set(), HOY)
    items = items["items"] + items["extra"]
    obtenido = [
        {
            "clave": i["clave"], "tipo": i["tipo"], "fuente_id": i["fuente_id"], "fecha": i["fecha"],
            "etiqueta": i["etiqueta"], "sub": i["sub"], "monto": i["monto"], "texto": i["texto_dias"],
        }
        for i in items
    ]
    esperado = [{k: v for k, v in e.items() if k != "dias"} for e in EXP["proximas"]]
    invs = {i["id"]: i for i in INVS}
    for fila in esperado:
        if fila["tipo"] == "inversion":
            fila["monto"] = rendimiento_esperado(invs[fila["fuente_id"]])
    assert obtenido == esperado


def test_recurrentes_proxima_fecha():
    for rid, fecha, texto in EXP["recurrente_proxima"]:
        r = next(x for x in RECS if x["id"] == rid)
        d = operaciones.frecuencias.proxima_fecha_recurrente(r["fecha_inicio"], r["frecuencia"], HOY)
        assert (d.isoformat() if d else None) == fecha, rid
        derivada = operaciones.derivar_recurrente(dict(r, activo=1), HOY)["proximo_pago"]
        assert (derivada["texto"] if derivada else None) == texto, rid


def test_recurrentes_proxima_fecha_otros_hoy():
    for caso in EXP["recurrente_proxima_otras_fechas"]:
        hoy = datetime.date.fromisoformat(caso["hoy"])
        for r, esperado in zip(RECS, caso["r"]):
            d = operaciones.frecuencias.proxima_fecha_recurrente(r["fecha_inicio"], r["frecuencia"], hoy)
            assert (d.isoformat() if d else None) == esperado, (caso["hoy"], r["id"])


def test_inversion_proxima_fecha():
    for dia, fecha, texto in EXP["inv_proxima"]:
        d = operaciones.finanzas.proxima_fecha_inversion(dia, HOY)
        assert d.isoformat() == fecha, dia
        assert operaciones.derivar_inversion(dict(INVS[0], dia_pago=dia, pago="mensual"), HOY)["proximo_pago"]["texto"] == texto
    for caso in EXP["inv_proxima_otras_fechas"]:
        hoy = datetime.date.fromisoformat(caso["hoy"])
        assert [operaciones.finanzas.proxima_fecha_inversion(d, hoy).isoformat() for d in (29, 30, 31, 15)] == caso["r"], caso["hoy"]


def test_to_mensual():
    for frecuencia, valor in EXP["to_mensual"]:
        assert operaciones.frecuencias.to_mensual(1000000, frecuencia) == valor, frecuencia


def test_rendimiento_y_tasas():
    for monto, tasa, esperado in EXP["rendimiento"]:
        assert operaciones.finanzas.rendimiento_mensual_fija(monto, tasa) == esperado, (monto, tasa)
    for v, mv, ea in EXP["tasas"]:
        assert operaciones.finanzas.ea_a_mv(v) == pytest.approx(mv, rel=1e-12)
        assert operaciones.finanzas.mv_a_ea(v) == pytest.approx(ea, rel=1e-12)


def test_cambio_valor_y_desglose():
    for nuevo, anterior, base, esperado in EXP["cambio_valor"]:
        r = operaciones.cambio_valor(nuevo, anterior, base)
        assert r == {"delta": esperado["delta"], "total": esperado["total"], "total_pct": esperado["totalPct"]}
    for saldo, total, nuevo, esperado, comision in EXP["desglose"]:
        assert operaciones.desglose_pago(saldo, total, nuevo) == esperado
        assert operaciones.comision_adelanto(saldo, total, nuevo) == comision


def test_deudas_intereses_y_saldo():
    for esperado in EXP["deudas"]:
        d = next(x for x in DEUDAS if x["id"] == esperado["id"])
        assert tiene_saldo(d) == esperado["tiene_saldo"], d["nombre"]
        assert operaciones.finanzas.estimar_intereses_pagados(d["monto_inicial"], d["saldo_actual"], d["tasa_ea"], d["cuota_mensual"]) == esperado["estimado"]
        assert operaciones.finanzas.intereses_pagados(d) == esperado["intereses"], d["nombre"]
    for args, esperado in EXP["estimar_extra"]:
        assert operaciones.finanzas.estimar_intereses_pagados(*args) == esperado, args


@pytest.mark.parametrize("caso", EXP["listar"], ids=lambda c: "-".join(map(str, c["args"])))
def test_listar_transacciones(caso):
    col, dir_, tipo, mes, cat = caso["args"]
    r = listados.listar_transacciones(TXS, col, dir_, tipo, mes, cat, hoy=HOY)
    assert [t["id"] for t in r["items"]] == caso["ids"]


def test_opciones_listado():
    r = listados.listar_transacciones(TXS, hoy=HOY)
    assert r["opciones"]["categorias"] == EXP["categorias_disponibles"]
    assert [m["value"] for m in r["opciones"]["meses"]] == EXP["meses_disponibles"]


def test_buckets_de_fecha():
    for tid, grupo in EXP["buckets"]:
        t = next(x for x in TXS if x["id"] == tid)
        assert listados.grupo_fecha(fechas.normalizar_fecha(t["fecha"]), HOY) == grupo, (tid, t["fecha"])
    for fecha, grupo in EXP["bucket_extra"]:
        assert listados.grupo_fecha(fecha, HOY) == grupo, fecha


def test_desactualizado_y_normalizar():
    for fecha, stale, _ in EXP["stale"]:
        assert fechas.es_desactualizado(fecha, HOY) == stale, fecha
    for entrada, esperado in EXP["norm_fecha"]:
        assert fechas.normalizar_fecha(entrada) == esperado, entrada
    for fecha, _, norm in EXP["stale"]:
        assert fechas.normalizar_fecha(fecha) == norm


def test_orden_de_texto_como_icu():
    palabras = ["b", "Á", "a", "A", "á", "Z", "é", "e", "E", "Éxito", "exito", "ñ", "n", "o", "nz"]
    esperado = ["a", "A", "á", "Á", "b", "e", "E", "é", "exito", "Éxito", "n", "nz", "ñ", "o", "Z"]
    assert sorted(palabras, key=listados._clave_texto) == esperado
