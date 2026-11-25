import pytest

from backend.calculos.base.formato import (
    cop,
    cop_corto,
    frase,
    frase_flujo,
    pct_barra,
    plural,
    porcentaje_texto,
    top_segmentos,
    tono_de_valor,
)


def test_cop_formatea_como_es_co():
    assert cop(1234) == "$1.234"
    assert cop(2.5) == "$3"
    assert cop(1_000_000, "US$") == "US$1.000.000"
    assert cop(0) == "$0"
    assert cop(-1234.5) == "$-1.235"
    assert cop(999) == "$999"


def test_cop_de_negativo_que_redondea_a_cero_no_lleva_signo():
    assert cop(-0.4) == "$0"


def test_cop_corto_escala_como_el_front():
    assert cop_corto(950) == "$950"
    assert cop_corto(1_500) == "$2k"
    assert cop_corto(1_320_000) == "$1,3M"
    assert cop_corto(-2_500_000_000) == "−$2,5B"


@pytest.mark.parametrize("valor,esperado", [
    (999, "$999"), (1_000, "$1k"), (999_499, "$999k"), (999_500, "$1000k"), (999_999, "$1000k"),
    (1_000_000, "$1,0M"), (1_040_000, "$1,0M"), (999_999_999, "$1000,0M"), (1_000_000_000, "$1,0B"),
    (-999, "−$999"), (-1_000, "−$1k"), (-1_000_000, "−$1,0M"), (-1_000_000_000, "−$1,0B"), (0, "$0"),
])
def test_cop_corto_en_los_bordes_de_cada_escala(valor, esperado):
    assert cop_corto(valor) == esperado


def test_cop_corto_con_simbolo():
    assert cop_corto(950, "US$") == "US$950" and cop_corto(1_500, "€") == "€2k"
    assert cop_corto(1_320_000, "€") == "€1,3M" and cop_corto(-3_000_000_000, "£") == "−£3,0B"
    assert cop_corto(-950, "€") == "−€950"


def test_porcentaje_texto():
    assert porcentaje_texto(12.25) in ("12,3", "12,2")
    assert porcentaje_texto(1234.5, 0) in ("1.234", "1.235")
    assert porcentaje_texto(None) == "0,0"
    assert porcentaje_texto(0) == "0,0"
    assert porcentaje_texto(1234.56) == "1.234,6"
    assert porcentaje_texto(0.123456, 4) == "0,1235"
    assert porcentaje_texto(-5.5) == "-5,5"


def test_tono_de_valor():
    assert [tono_de_valor(v) for v in (1, 0.01, 0, -0.01, -1)] == ["positivo", "positivo", "neutro", "negativo", "negativo"]


def test_pct_barra():
    assert pct_barra(50, 100) == 50
    assert pct_barra(-50, 100) == 50
    assert pct_barra(1, 100) == 2
    assert pct_barra(1, 100, 5) == 5
    assert pct_barra(0, 100) == 0
    assert pct_barra(0, 100, 5) == 0
    assert pct_barra(5, 0) == 0
    assert pct_barra(5, -3) == 0
    assert pct_barra(100, 100) == 100
    assert pct_barra(2, 100) == 2 and pct_barra(3, 100) == 3


def test_plural():
    assert plural(1, "deuda", "deudas") == "1 deuda"
    assert plural(0, "deuda", "deudas") == "0 deudas"
    assert plural(2, "deuda", "deudas") == "2 deudas"


def test_frase_une_partes_y_conserva_tonos():
    f = frase("a ", ("b", "fuerte"))
    assert f == {"texto": "a b", "partes": [{"texto": "a ", "tono": None}, {"texto": "b", "tono": "fuerte"}]}
    assert frase() == {"texto": "", "partes": []}


def test_frase_flujo_arma_partes_con_tonos():
    assert frase_flujo("entró", "salió", 1500, 700) == {
        "texto": "entró $1.500 · salió $700",
        "partes": [
            {"texto": "entró ", "tono": None}, {"texto": "$1.500", "tono": "positivo"},
            {"texto": " · salió ", "tono": None}, {"texto": "$700", "tono": "fuerte"}, {"texto": "", "tono": None},
        ],
    }
    assert frase_flujo("entran", "salen", 1, 2, "€", " en fijos")["texto"] == "entran €1 · salen €2 en fijos"


def seg(k, v):
    return {"key": k, "label": k, "valor": v}


def test_top_segmentos_descarta_ceros_ordena_y_agrupa_en_otros():
    assert top_segmentos([seg("a", 0), seg("b", -3), seg("c", 5), seg("d", 2)]) == [seg("c", 5), seg("d", 2)]
    assert top_segmentos([]) == []
    cinco = [seg(str(i), i) for i in range(1, 6)]
    assert [s["key"] for s in top_segmentos(cinco)] == ["5", "4", "3", "2", "1"]
    seis = [seg(str(i), i) for i in range(1, 7)]
    assert top_segmentos(seis) == [seg("6", 6), seg("5", 5), seg("4", 4), seg("3", 3), {"key": "__otros", "label": "Otros", "valor": 3}]
    siete = [seg(str(i), i) for i in range(1, 8)]
    assert top_segmentos(siete)[-1] == {"key": "__otros", "label": "Otros", "valor": 3 + 2 + 1}


def test_top_segmentos_con_n_personalizado():
    tres = [seg("a", 3), seg("b", 2), seg("c", 1)]
    assert top_segmentos(tres, 2) == tres
    cuatro = tres + [seg("d", 0.5)]
    assert top_segmentos(cuatro, 2) == [seg("a", 3), seg("b", 2), {"key": "__otros", "label": "Otros", "valor": 1.5}]


def test_cop_corto_miles_de_millones_redondea_a_un_decimal():
    assert cop_corto(1_050_000_000) == "$1,1B" and cop_corto(1_949_000_000) == "$1,9B"


def test_pct_barra_con_maximo_de_un_peso():
    assert pct_barra(1, 1) == 100 and pct_barra(0.5, 1) == 50
