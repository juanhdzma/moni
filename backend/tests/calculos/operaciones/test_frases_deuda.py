from backend.calculos.operaciones import derivar_deuda
from backend.calculos.operaciones.frases_deuda import (
    TEXTO_VACIO_TARJETAS,
    con_frases,
    descripcion_adelanto,
    descripcion_credito,
    descripcion_pago,
    frases_deuda,
    frases_resumen,
    texto_vacio_creditos,
)

from ..helpers_operaciones import deuda

ESTIMADO = "Estimado por amortización — todavía no hay pagos registrados"


def derivada(**kw):
    base = {"es_tarjeta": 0, "tasa_ea": 12.5, "saldo_actual": 500, "cuota_mensual": 100}
    return derivar_deuda(deuda(**{**base, **kw}))


def test_descripciones_de_asientos_de_deuda():
    assert descripcion_pago("Banco", 1500, 250.4) == "Cuota · Banco (capital $1.500, intereses $250)"
    assert descripcion_pago("Banco", 1500, 250, "US$") == "Cuota · Banco (capital US$1.500, intereses US$250)"
    assert descripcion_adelanto("Visa") == "Adelanto · Visa"
    assert descripcion_credito("Visa") == "Crédito · Visa"


def test_frases_prestamo_activo_con_intereses_estimados():
    assert frases_deuda(derivada()) == {
        "detalle": "12,5% EA · $100/mes",
        "meses_restantes_texto": "~5m",
        "progreso_texto": "50,0% pagado",
        "intereses_texto": "~$46",
        "intereses_ayuda": ESTIMADO,
        "disponible_texto": None,
        "intereses_saldada_texto": "~$46 en intereses",
        "saldada_badge": "Saldado",
        "capital_pagado_texto": "capital total pagado",
    }


def test_frases_prestamo_con_intereses_exactos_y_simbolo():
    f = frases_deuda(derivada(total_intereses=1234), "US$")
    assert f["detalle"] == "12,5% EA · US$100/mes"
    assert f["intereses_texto"] == "US$1.234"
    assert f["intereses_ayuda"] == "Suma de los pagos registrados en Moni"
    assert f["intereses_saldada_texto"] == "US$1.234 en intereses"


def test_frases_prestamo_saldado_sin_cuota_ni_meses():
    f = frases_deuda(derivada(saldo_actual=0))
    assert f["detalle"] == "12,5% EA"
    assert f["meses_restantes_texto"] is None
    assert f["progreso_texto"] == "100,0% pagado"
    assert f["intereses_texto"] == "~$58"


def test_meses_restantes_redondea_hacia_arriba_y_sin_cuota_es_none():
    assert frases_deuda(derivada(saldo_actual=501))["meses_restantes_texto"] == "~6m"
    assert frases_deuda(derivada(saldo_actual=500))["meses_restantes_texto"] == "~5m"
    assert frases_deuda(derivada(cuota_mensual=0))["meses_restantes_texto"] is None


def test_prestamo_sin_intereses_calculables_no_tiene_texto_de_intereses():
    f = frases_deuda(derivada(tasa_ea=0))
    assert f["intereses_texto"] is None
    assert f["intereses_saldada_texto"] is None
    assert f["intereses_ayuda"] == ESTIMADO


def test_tarjeta_con_cupo_muestra_disponible():
    f = frases_deuda(derivada(es_tarjeta=1, cupo=1000, saldo_actual=300))
    assert f["detalle"] == "Cupo $1.000"
    assert f["disponible_texto"] == "$700"
    assert frases_deuda(derivada(es_tarjeta=1, cupo=1000, saldo_actual=300), "€")["detalle"] == "Cupo €1.000"


def test_tarjeta_sin_cupo_no_muestra_disponible():
    f = frases_deuda(derivada(es_tarjeta=1, cupo=0, saldo_actual=300))
    assert f["detalle"] == "Sin cupo definido"
    assert f["disponible_texto"] is None
    assert frases_deuda(derivada(es_tarjeta=1, saldo_actual=300))["detalle"] == "Sin cupo definido"


def test_frases_resumen_con_intereses_aproximados_y_exactos():
    r = {"total_cuotas": 1500, "total_intereses": 2500, "intereses_aproximado": True}
    assert frases_resumen(r) == {
        "cuotas": "$1.500",
        "cuotas_sufijo": "/mes en cuotas",
        "intereses": "~$2.500",
        "intereses_sufijo": "pagados en intereses",
    }
    assert frases_resumen({**r, "intereses_aproximado": False}, "€")["intereses"] == "€2.500"
    assert frases_resumen({**r, "total_intereses": 0})["intereses"] is None


def test_texto_vacio_creditos():
    assert texto_vacio_creditos(True) == {"titulo": "Sin créditos activos", "texto": "¡Todos los créditos están saldados!"}
    assert texto_vacio_creditos(False) == {"titulo": "Sin créditos", "texto": "Agregá uno con el botón + de arriba."}
    assert TEXTO_VACIO_TARJETAS == {"titulo": "Sin tarjetas", "texto": "Agregá una para cargarle gastos y seguir su cupo."}


def test_con_frases_anota_cada_fila_y_oculta_campos_internos():
    c, t, s = derivada(id=1), derivada(id=2, es_tarjeta=1, cupo=1000), derivada(id=3, saldo_actual=0)
    resumen = {
        "creditos": [c], "tarjetas": [t], "terminadas": [s], "otro": "x",
        "total_cuotas": 100, "total_intereses": 0, "intereses_aproximado": False,
    }
    out = con_frases(resumen, "€")
    assert set(out) == {"creditos", "tarjetas", "terminadas", "otro", "texto_vacio_creditos", "texto_vacio_tarjetas", "dato"}
    assert out["otro"] == "x"
    assert out["creditos"] == [{**c, "frases": frases_deuda(c, "€")}]
    assert out["tarjetas"] == [{**t, "frases": frases_deuda(t, "€")}]
    assert out["terminadas"] == [{**s, "frases": frases_deuda(s, "€")}]
    assert out["texto_vacio_creditos"] == texto_vacio_creditos(True)
    assert out["texto_vacio_tarjetas"] == TEXTO_VACIO_TARJETAS
    assert out["dato"] == frases_resumen(resumen, "€")
    assert con_frases({**resumen, "terminadas": []})["texto_vacio_creditos"] == texto_vacio_creditos(False)


def test_bordes_de_cuota_cupo_e_intereses_de_un_peso():
    assert frases_deuda(derivada(saldo_actual=7, cuota_mensual=1))["meses_restantes_texto"] == "~7m"
    assert frases_deuda(derivada(es_tarjeta=1, cupo=1, saldo_actual=0))["detalle"] == "Cupo $1"
    assert frases_deuda(derivada(es_tarjeta=1, cupo=1000, saldo_actual=300), "€")["disponible_texto"] == "€700"
    r = {"total_cuotas": 1500, "total_intereses": 1, "intereses_aproximado": False}
    assert frases_resumen(r, "€")["cuotas"] == "€1.500"
    assert frases_resumen(r)["intereses"] == "$1"
