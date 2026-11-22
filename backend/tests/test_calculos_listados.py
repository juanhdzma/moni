from datetime import date

import pytest

from backend.calculos import listados as L

HOY = date(2026, 8, 20)


def tx(tipo, categoria, monto, **kw):
    return {"id": 1, "fecha": "2026-08-01", "tipo": tipo, "categoria": categoria, "descripcion": "", "monto": monto, "notas": "", "tarjeta_id": None, **kw}


def test_tiene_saldo():
    assert L.tiene_saldo({"saldo_actual": 1})
    assert not L.tiene_saldo({"saldo_actual": 0.99})
    assert not L.tiene_saldo({"saldo_actual": 1.16e-10})


def test_listar_excluye_transfers_ordena_y_filtra():
    txs = [
        tx("gasto", "A", 10, fecha="2026-08-02"),
        tx("ingreso", "B", 50, fecha="2026-07-01"),
        tx("transfer", "Pago deuda", 99),
        tx("gasto", "A", 30, fecha="2026-08-05"),
    ]
    montos = lambda r: [t["monto"] for t in r["items"]]
    assert montos(L.listar_transacciones(txs, "fecha", -1, hoy=HOY)) == [30, 10, 50]
    assert montos(L.listar_transacciones(txs, "monto", 1, hoy=HOY)) == [10, 30, 50]
    assert len(L.listar_transacciones(txs, "fecha", -1, "gasto", "2026-08", "A", HOY)["items"]) == 2
    assert len(L.listar_transacciones(txs, "fecha", -1, mes="2026-07", hoy=HOY)["items"]) == 1


def test_listar_ignora_filtros_inexistentes_y_arma_pills():
    txs = [tx("gasto", "A", 10), tx("ingreso", "B", 5)]
    r = L.listar_transacciones(txs, tipo="otro", mes="2020-01", cat="Z", hoy=HOY)
    assert r["filtros"] == {"tipo": "", "mes": "", "cat": ""}
    assert r["pills"] == [] and len(r["items"]) == 2
    r = L.listar_transacciones(txs, tipo="gasto", mes="2026-08", cat="A", hoy=HOY)
    assert r["pills"] == [
        {"campo": "mes", "label": "agosto de 2026"},
        {"campo": "tipo", "label": "Gastos"},
        {"campo": "cat", "label": "A"},
    ]
    assert r["resumen"]["gastos"] == 10 and r["resumen"]["neto"] == -10


def test_listar_grupo_solo_al_ordenar_por_fecha():
    txs = [tx("gasto", "A", 10, fecha="2026-08-20T09:00")]
    assert L.listar_transacciones(txs, "fecha", hoy=HOY)["items"][0]["grupo"] == "Hoy"
    assert L.listar_transacciones(txs, "monto", hoy=HOY)["items"][0]["grupo"] is None


def test_listar_columna_invalida():
    with pytest.raises(ValueError):
        L.listar_transacciones([], "otra", hoy=HOY)


def test_orden_texto_minuscula_antes_que_mayuscula_como_icu():
    txs = [tx("gasto", "b", 1, id=1), tx("gasto", "A", 2, id=2), tx("gasto", "a", 3, id=3)]
    r = L.listar_transacciones(txs, "categoria", 1, hoy=HOY)
    assert [t["monto"] for t in r["items"]] == [3, 2, 1]


def test_meses_y_categorias_disponibles():
    txs = [tx("gasto", "B", 1, fecha="2026-07-01"), tx("transfer", "A", 1, fecha="2026-08-01")]
    assert L.meses_disponibles(txs) == ["2026-08", "2026-07"]
    assert L.categorias_disponibles(txs) == ["A", "B"]
    assert L.etiqueta_mes("2026-11") == "noviembre de 2026"


def test_inicio_semana_es_lunes():
    assert L.inicio_semana(date(2026, 8, 16)) == date(2026, 8, 10)
    assert L.inicio_semana(date(2026, 8, 12)) == date(2026, 8, 10)
    assert L.inicio_semana(date(2026, 8, 10)) == date(2026, 8, 10)


def test_grupo_fecha():
    assert L.grupo_fecha("2026-08-20", HOY) == "Hoy"
    assert L.grupo_fecha("2026-08-19T08:00", HOY) == "Ayer"
    assert L.grupo_fecha("2026-08-17", HOY) == "Esta semana"
    assert L.grupo_fecha("2026-08-05", HOY) == "Este mes"
    assert L.grupo_fecha("2026-03-05", HOY) == "Marzo - 2026"
    assert L.grupo_fecha("5/3/2026", HOY) == "Marzo - 2026"


def test_resumen_tx():
    assert L.resumen_tx([]) == {"ingresos": 0, "gastos": 0, "neto": 0, "segmentos": []}
    r = L.resumen_tx([tx("ingreso", "Salario", 1000), tx("gasto", "Comida", 400), tx("gasto", "Comida", 100), tx("gasto", "Ocio", 50)])
    assert (r["ingresos"], r["gastos"], r["neto"]) == (1000, 550, 450)
    assert r["segmentos"] == [{"key": "Comida", "label": "Comida", "valor": 500}, {"key": "Ocio", "label": "Ocio", "valor": 50}]


def test_top_segmentos():
    seg = lambda k, v: {"key": k, "label": k, "valor": v}
    assert L.top_segmentos([seg("a", 0), seg("b", 2), seg("c", 5)]) == [seg("c", 5), seg("b", 2)]
    cinco = [seg(str(i), i) for i in range(1, 6)]
    assert len(L.top_segmentos(cinco)) == 5
    seis = [seg(str(i), i) for i in range(1, 7)]
    r = L.top_segmentos(seis)
    assert [s["key"] for s in r] == ["6", "5", "4", "3", "__otros"]
    assert r[-1] == {"key": "__otros", "label": "Otros", "valor": 3}


def test_derivar_tx():
    deudas = {7: {"nombre": "Visa Platinum Banco Muy Largo", "franquicia": "Visa"}}
    d = L.derivar_tx(tx("gasto", "A", 5, fecha="3/8/2026 14:05", tarjeta_id=7), deudas)
    assert d["fecha"] == "2026-08-03T14:05" and d["mes"] == "2026-08"
    assert d["es_gasto_cartera"] is False
    assert d["metodo_pago"] == "Visa Platinum Banco …" and d["tarjeta_franquicia"] == "Visa"
    d = L.derivar_tx(tx("gasto", "A", 5), deudas)
    assert d["es_gasto_cartera"] is True and d["metodo_pago"] == "Efectivo / Débito" and d["tarjeta_nombre"] is None
    assert L.derivar_tx(tx("gasto", "A", 5, tarjeta_id=99), deudas)["metodo_pago"] == "Efectivo / Débito"
    assert L.derivar_tx(tx("ingreso", "A", 5, tarjeta_id=7), deudas)["metodo_pago"] == "Efectivo / Débito"


def test_categorias_con_custom():
    cats = L.categorias_con_custom([
        {"tipo": "ingreso", "nombre": "Freelance"},
        {"tipo": "ingreso", "nombre": "Intereses"},
        {"tipo": "gasto", "nombre": "Viajes"},
    ])
    assert list(cats) == ["ingreso", "gasto", "transfer"]
    assert cats["ingreso"][-1] == {"nombre": "Freelance", "sistema": False}
    assert [c["nombre"] for c in cats["ingreso"]].count("Intereses") == 1
    assert cats["gasto"] == [{"nombre": "Inversión", "sistema": True}, {"nombre": "Compra activos", "sistema": True}, {"nombre": "Viajes", "sistema": False}]
    assert L.categorias_con_custom([])["transfer"] == [{"nombre": "Pago deuda", "sistema": True}]


def test_es_categoria_sistema():
    assert L.es_categoria_sistema("ingreso", "Intereses")
    assert not L.es_categoria_sistema("gasto", "Freelance")
    assert not L.es_categoria_sistema("otro", "Intereses")


def test_validar_categoria():
    assert L.validar_categoria("gasto", "  Mercado ", []) == "Mercado"
    with pytest.raises(ValueError):
        L.validar_categoria("gasto", "   ", [])
    with pytest.raises(ValueError):
        L.validar_categoria("otro", "x", [])
    with pytest.raises(L.CategoriaDuplicada):
        L.validar_categoria("gasto", "Inversión", [])
    with pytest.raises(L.CategoriaDuplicada):
        L.validar_categoria("gasto", "Viajes", ["Viajes"])


def test_validar_simbolo():
    assert L.validar_simbolo(" US$ ") == "US$"
    for malo in ["", "   ", "12345", "a\nb", None]:
        with pytest.raises(ValueError):
            L.validar_simbolo(malo)


def test_alertas():
    viejo, nuevo = "2026-06-01", "2026-08-15"
    assert L.alertas([{"valor_actualizado_en": viejo}], [], HOY) == {"activos": True, "inversiones": False}
    inv = [{"tipo": "fija", "valor_actualizado_en": viejo}, {"tipo": "variable", "valor_actualizado_en": nuevo}]
    assert L.alertas([{"valor_actualizado_en": nuevo}], inv, HOY) == {"activos": False, "inversiones": False}
    inv.append({"tipo": "variable", "valor_actualizado_en": viejo})
    assert L.alertas([], inv, HOY)["inversiones"] is True
