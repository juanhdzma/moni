from datetime import date

import pytest

from backend.calculos.operaciones import listados as L
from backend.calculos.catalogo.constantes import tiene_saldo
from backend.calculos.base.formato import top_segmentos

HOY = date(2026, 8, 20)


def tx(tipo, categoria, monto, **kw):
    return {"id": 1, "fecha": "2026-08-01", "tipo": tipo, "categoria": categoria, "descripcion": "", "monto": monto, "notas": "", "tarjeta_id": None, **kw}


def test_tiene_saldo():
    assert tiene_saldo({"saldo_actual": 1})
    assert not tiene_saldo({"saldo_actual": 0.99})
    assert not tiene_saldo({"saldo_actual": 1.16e-10})


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


def test_meses_disponibles_ignora_fechas_vacias_o_invalidas():
    txs = [tx("gasto", "B", 1, fecha=""), tx("gasto", "B", 1, fecha="basura"), tx("gasto", "B", 1, fecha="2026-07-01")]
    assert L.meses_disponibles(txs) == ["2026-07"]
    assert len(L.listar_transacciones(txs, hoy=HOY)["items"]) == 3


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
    vacio = L.resumen_tx([])
    assert vacio["dato"]["texto"] == "entró $0 · salió $0" and vacio["segmentos"] == []
    r = L.resumen_tx([tx("ingreso", "Salario", 1000), tx("gasto", "Comida", 400), tx("gasto", "Comida", 100), tx("gasto", "Ocio", 50)])
    assert (r["ingresos"], r["gastos"], r["neto"]) == (1000, 550, 450)
    assert r["dato"]["texto"] == "entró $1.000 · salió $550"
    assert L.resumen_tx([tx("ingreso", "Salario", 10)], "US$")["dato"]["texto"] == "entró US$10 · salió US$0"
    assert r["segmentos"] == [{"key": "Comida", "label": "Comida", "valor": 500}, {"key": "Ocio", "label": "Ocio", "valor": 50}]


def test_top_segmentos():
    seg = lambda k, v: {"key": k, "label": k, "valor": v}
    assert top_segmentos([seg("a", 0), seg("b", 2), seg("c", 5)]) == [seg("c", 5), seg("b", 2)]
    cinco = [seg(str(i), i) for i in range(1, 6)]
    assert len(top_segmentos(cinco)) == 5
    seis = [seg(str(i), i) for i in range(1, 7)]
    r = top_segmentos(seis)
    assert [s["key"] for s in r] == ["6", "5", "4", "3", "__otros"]
    assert r[-1] == {"key": "__otros", "label": "Otros", "valor": 3}


def test_derivar_tx():
    deudas = {7: {"nombre": "Visa Platinum Banco Muy Largo", "franquicia": "Visa"}}
    d = L.derivar_tx(tx("gasto", "A", 5, fecha="3/8/2026 14:05", tarjeta_id=7), deudas)
    assert d["fecha"] == "2026-08-03T14:05" and "mes" not in d and "es_gasto_cartera" not in d
    assert d["metodo_pago"] == "Visa Platinum Banco …" and d["tarjeta_franquicia"] == "Visa"
    d = L.derivar_tx(tx("gasto", "A", 5), deudas)
    assert d["metodo_pago"] == "Efectivo / Débito" and d["tarjeta_nombre"] is None
    assert L.derivar_tx(tx("gasto", "A", 5, tarjeta_id=99), deudas)["metodo_pago"] == "Efectivo / Débito"
    assert L.derivar_tx(tx("ingreso", "A", 5, tarjeta_id=7), deudas)["metodo_pago"] == "Efectivo / Débito"


def test_alertas():
    viejo, nuevo = "2026-06-01", "2026-08-15"
    assert L.alertas([{"valor_actualizado_en": viejo}], [], HOY) == {"activos": True, "inversiones": False}
    inv = [{"tipo": "fija", "valor_actualizado_en": viejo}, {"tipo": "variable", "valor_actualizado_en": nuevo}]
    assert L.alertas([{"valor_actualizado_en": nuevo}], inv, HOY) == {"activos": False, "inversiones": False}
    inv.append({"tipo": "variable", "valor_actualizado_en": viejo})
    assert L.alertas([], inv, HOY)["inversiones"] is True


def test_atributos_visuales_tx():
    deudas = {7: {"nombre": "Visa", "franquicia": "Mastercard"}}
    gasto_tarjeta = L.derivar_tx(tx("gasto", "A", 5, tarjeta_id=7), deudas)
    assert (gasto_tarjeta["editable"], gasto_tarjeta["tono"], gasto_tarjeta["icono_metodo"]) == (True, "gasto", "Mastercard")
    ingreso = L.derivar_tx(tx("ingreso", "A", 5), deudas)
    assert (ingreso["editable"], ingreso["tono"], ingreso["icono_metodo"]) == (True, "ingreso", "efectivo")
    transfer = L.derivar_tx(tx("transfer", "Pago deuda", 5), deudas)
    assert (transfer["editable"], transfer["tono"]) == (False, "neutro")
    huerfano = L.derivar_tx(tx("gasto", "A", 5, tarjeta_id=99), deudas)
    assert huerfano["icono_metodo"] == "efectivo"


def test_resumen_tx_firma_gastos_y_rotula_segun_tarjeta():
    deudas = {7: {"nombre": "Visa", "franquicia": "Visa"}}
    efectivo = [L.derivar_tx(tx("gasto", "A", 5), deudas), L.derivar_tx(tx("ingreso", "S", 20), deudas)]
    r = L.listar_transacciones(efectivo, hoy=HOY)["resumen"]
    assert r["titulo"] == "Te quedó" and r["gastos_firmado"] == -5
    con_tarjeta = efectivo + [L.derivar_tx(tx("gasto", "B", 3, tarjeta_id=7), deudas)]
    assert L.listar_transacciones(con_tarjeta, hoy=HOY)["resumen"]["titulo"] == "Ingresos menos gastos"
    assert L.listar_transacciones(con_tarjeta, cat="B", hoy=HOY)["resumen"]["titulo"] == "Ingresos menos gastos con estos filtros"


def test_columnas_transaccion_marcan_ordenable_y_oculta_en_movil():
    por_col = {c["col"]: c for c in L.columnas_transaccion()}
    assert por_col["tipo"]["oculta_en_movil"] and por_col["categoria"]["oculta_en_movil"]
    assert not por_col["fecha"]["oculta_en_movil"] and por_col["fecha"]["ordenable"]
    assert por_col["metodo_pago"]["ordenable"] is False


CATEGORIAS = {
    "ingreso": [{"nombre": "Salario"}, {"nombre": "Extra"}],
    "gasto": [{"nombre": "Comida"}, {"nombre": "Ocio"}],
}
DEUDAS = [
    {"id": 1, "nombre": "Visa", "es_tarjeta": 1},
    {"id": 2, "nombre": "Préstamo", "es_tarjeta": 0},
    {"id": 3, "nombre": "Master", "es_tarjeta": True},
]


def test_opciones_tx_nueva_ofrece_gasto_y_la_fecha_de_ahora():
    assert L.opciones_tx(CATEGORIAS, DEUDAS, None, "2026-08-20T10:30") == {
        "tarjetas": [{"id": 1, "nombre": "Visa"}, {"id": 3, "nombre": "Master"}],
        "categorias": {"ingreso": ["Salario", "Extra"], "gasto": ["Comida", "Ocio"]},
        "categoria_default": {"ingreso": "Salario", "gasto": "Comida"},
        "inicial": {"tipo": "gasto", "categoria": "Comida", "tarjeta_id": None, "fecha": "2026-08-20T10:30"},
    }


def test_opciones_tx_edicion_de_ingreso_conserva_categoria_y_fecha():
    r = L.opciones_tx(CATEGORIAS, DEUDAS, tx("ingreso", "Extra", 5, fecha="2026-03-04T08:15"), "ahora")
    assert r["inicial"] == {"tipo": "ingreso", "categoria": "Extra", "tarjeta_id": None, "fecha": "2026-03-04T08:15"}


def test_opciones_tx_edicion_de_gasto_con_tarjeta_conserva_la_tarjeta():
    r = L.opciones_tx(CATEGORIAS, DEUDAS, tx("gasto", "Ocio", 5, tarjeta_id=3, fecha="2026-03-04"), "ahora")
    assert r["inicial"] == {"tipo": "gasto", "categoria": "Ocio", "tarjeta_id": 3, "fecha": "2026-03-04T00:00"}


def test_opciones_tx_tarjeta_que_ya_no_existe_o_no_es_tarjeta_se_descarta():
    assert L.opciones_tx(CATEGORIAS, DEUDAS, tx("gasto", "Ocio", 5, tarjeta_id=99), "a")["inicial"]["tarjeta_id"] is None
    assert L.opciones_tx(CATEGORIAS, DEUDAS, tx("gasto", "Ocio", 5, tarjeta_id=2), "a")["inicial"]["tarjeta_id"] is None
    assert L.opciones_tx(CATEGORIAS, DEUDAS, tx("gasto", "Ocio", 5, tarjeta_id=1), "a")["inicial"]["tarjeta_id"] == 1


def test_opciones_tx_agrega_la_categoria_borrada_del_tx_solo_a_su_tipo():
    r = L.opciones_tx(CATEGORIAS, DEUDAS, tx("gasto", "Vieja", 5), "a")
    assert r["categorias"] == {"ingreso": ["Salario", "Extra"], "gasto": ["Comida", "Ocio", "Vieja"]}
    assert r["categoria_default"]["gasto"] == "Comida" and r["inicial"]["categoria"] == "Vieja"
    assert CATEGORIAS["gasto"] == [{"nombre": "Comida"}, {"nombre": "Ocio"}]
    r = L.opciones_tx(CATEGORIAS, DEUDAS, tx("ingreso", "Vieja", 5), "a")
    assert r["categorias"]["ingreso"] == ["Salario", "Extra", "Vieja"] and r["categorias"]["gasto"] == ["Comida", "Ocio"]


def test_opciones_tx_sin_categorias_usa_cadena_vacia():
    r = L.opciones_tx({"ingreso": [], "gasto": []}, [], None, "a")
    assert r["categoria_default"] == {"ingreso": "", "gasto": ""} and r["inicial"]["categoria"] == "" and r["tarjetas"] == []
    r = L.opciones_tx({"ingreso": [], "gasto": []}, [], tx("gasto", "", 5), "a")
    assert r["inicial"]["categoria"] == ""


def test_opciones_tx_normaliza_la_fecha_del_tx():
    for fecha, esperado in [("2026-03-04", "2026-03-04T00:00"), ("2026-03-04T08:15", "2026-03-04T08:15"),
                            ("4/3/2026 08:15", "2026-03-04T08:15"), ("2026-03-04T08:15:30", "2026-03-04T08:15"),
                            ("basura", ""), ("", "")]:
        assert L.opciones_tx(CATEGORIAS, [], tx("gasto", "Ocio", 1, fecha=fecha), "a")["inicial"]["fecha"] == esperado


def test_columnas_transaccion_completas():
    assert L.columnas_transaccion() == [
        {"col": "fecha", "label": "Fecha", "dir_defecto": -1, "ordenable": True, "oculta_en_movil": False},
        {"col": "tipo", "label": "Tipo", "dir_defecto": 1, "ordenable": True, "oculta_en_movil": True},
        {"col": "categoria", "label": "Categoría", "dir_defecto": 1, "ordenable": True, "oculta_en_movil": True},
        {"col": "descripcion", "label": "Descripción", "dir_defecto": 1, "ordenable": True, "oculta_en_movil": False},
        {"col": "monto", "label": "Monto", "dir_defecto": -1, "ordenable": True, "oculta_en_movil": False},
        {"col": "metodo_pago", "label": "Método de pago", "dir_defecto": 1, "ordenable": False, "oculta_en_movil": False},
    ]


def test_texto_vacio_movimientos():
    assert L.texto_vacio_movimientos() == {"titulo": "Sin transacciones", "texto": "Registrá un ingreso o gasto y aparece acá."}


def test_listar_devuelve_la_estructura_completa():
    txs = [tx("gasto", "Comida", 30, fecha="2026-08-20", id=1), tx("ingreso", "Salario", 100, fecha="2026-07-01", id=2)]
    r = L.listar_transacciones(txs, hoy=HOY)
    assert r["items"] == [
        {**txs[0], "tipo_label": "Gasto", "grupo": "Hoy"},
        {**txs[1], "tipo_label": "Ingreso", "grupo": "Julio - 2026"},
    ]
    assert r["filtros"] == {"tipo": "", "mes": "", "cat": ""} and r["pills"] == []
    assert r["opciones"] == {
        "meses": [{"value": "2026-08", "label": "agosto de 2026"}, {"value": "2026-07", "label": "julio de 2026"}],
        "categorias": ["Comida", "Salario"],
        "tipos": [{"value": "ingreso", "label": "Ingresos"}, {"value": "gasto", "label": "Gastos"}],
    }
    assert r["texto_vacio"] == {"titulo": "Sin movimientos", "texto": "Agregá un ingreso o gasto con el botón de arriba."}
    assert r["resumen"]["titulo"] == "Te quedó" and r["resumen"]["dato"]["texto"] == "entró $100 · salió $30"


def test_listar_usa_el_simbolo_en_el_resumen_y_los_defaults_de_orden():
    txs = [tx("gasto", "A", 10, fecha="2026-08-01", id=1), tx("gasto", "A", 20, fecha="2026-08-02", id=2)]
    r = L.listar_transacciones(txs, hoy=HOY, simbolo="US$")
    assert [t["id"] for t in r["items"]] == [2, 1]
    assert r["resumen"]["dato"]["texto"] == "entró US$0 · salió US$30"
    assert L.listar_transacciones(txs, hoy=HOY)["filtros"] == {"tipo": "", "mes": "", "cat": ""}


def test_grupo_fecha_invalida_es_cadena_vacia():
    assert L.grupo_fecha("basura", HOY) == "" and L.grupo_fecha("", HOY) == ""


def test_columna_invalida_mensaje_exacto():
    try:
        L.listar_transacciones([], "otra", hoy=HOY)
    except Exception as e:
        assert str(e) == "columna inválida" and e.status == 400
    else:
        raise AssertionError("debia fallar")


def test_derivar_tx_firma_el_monto_y_trunca_el_metodo_de_pago_en_el_borde():
    deudas = {7: {"nombre": "x" * 20, "franquicia": "Visa"}, 8: {"nombre": "y" * 21, "franquicia": None}}
    assert L.derivar_tx(tx("gasto", "A", 5, tarjeta_id=7), deudas)["metodo_pago"] == "x" * 20
    assert L.derivar_tx(tx("gasto", "A", 5, tarjeta_id=8), deudas)["metodo_pago"] == "y" * 20 + "…"
    assert L.derivar_tx(tx("gasto", "A", 5, tarjeta_id=8), deudas)["icono_metodo"] == "Otra"
    assert L.derivar_tx(tx("gasto", "A", 5), deudas)["monto_firmado"] == -5
    assert L.derivar_tx(tx("ingreso", "A", 5), deudas)["monto_firmado"] == 5
    assert L.derivar_tx(tx("transfer", "A", 5), deudas)["monto_firmado"] == -5


def test_resumen_tx_suma_varios_ingresos_y_gastos():
    r = L.resumen_tx([tx("ingreso", "S", 100), tx("ingreso", "S", 50), tx("gasto", "A", 10), tx("gasto", "A", 5), tx("transfer", "P", 999)])
    assert (r["ingresos"], r["gastos"], r["neto"], r["gastos_firmado"]) == (150, 15, 135, -15)
