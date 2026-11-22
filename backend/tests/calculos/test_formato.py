from backend.calculos.formato import cop, cop_corto, frase, porcentaje_texto


def test_cop_formatea_como_es_co():
    assert cop(1234) == "$1.234"
    assert cop(2.5) == "$3"
    assert cop(1_000_000, "US$") == "US$1.000.000"


def test_cop_corto_escala_como_el_front():
    assert cop_corto(950) == "$950"
    assert cop_corto(1_500) == "$2k"
    assert cop_corto(1_320_000) == "$1,3M"
    assert cop_corto(-2_500_000_000) == "−$2,5B"


def test_porcentaje_texto():
    assert porcentaje_texto(12.25) == "12,3" or porcentaje_texto(12.25) == "12,2"
    assert porcentaje_texto(1234.5, 0) in ("1.234", "1.235")
    assert porcentaje_texto(None) == "0,0"


def test_frase_une_partes_y_conserva_tonos():
    f = frase("a ", ("b", "fuerte"))
    assert f == {"texto": "a b", "partes": [{"texto": "a ", "tono": None}, {"texto": "b", "tono": "fuerte"}]}
