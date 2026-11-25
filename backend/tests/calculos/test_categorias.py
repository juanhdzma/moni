import pytest

from backend.calculos import categorias as C
from backend.calculos.categorias import CategoriaDuplicada


def test_categorias_con_custom():
    cats = C.categorias_con_custom([
        {"tipo": "ingreso", "nombre": "Freelance"},
        {"tipo": "ingreso", "nombre": "Intereses"},
        {"tipo": "gasto", "nombre": "Viajes"},
    ])
    assert list(cats) == ["ingreso", "gasto", "transfer"]
    assert cats["ingreso"][-1] == {"nombre": "Freelance", "sistema": False}
    assert [c["nombre"] for c in cats["ingreso"]].count("Intereses") == 1
    assert cats["gasto"] == [{"nombre": "Inversión", "sistema": True}, {"nombre": "Compra activos", "sistema": True}, {"nombre": "Viajes", "sistema": False}]
    assert C.categorias_con_custom([])["transfer"] == [{"nombre": "Pago deuda", "sistema": True}]


def test_es_categoria_sistema():
    assert C.es_categoria_sistema("ingreso", "Intereses")
    assert not C.es_categoria_sistema("gasto", "Freelance")
    assert not C.es_categoria_sistema("otro", "Intereses")


def test_validar_categoria():
    assert C.validar_categoria("gasto", "  Mercado ", []) == "Mercado"
    with pytest.raises(ValueError):
        C.validar_categoria("gasto", "   ", [])
    with pytest.raises(ValueError):
        C.validar_categoria("otro", "x", [])
    with pytest.raises(CategoriaDuplicada):
        C.validar_categoria("gasto", "Inversión", [])
    with pytest.raises(CategoriaDuplicada):
        C.validar_categoria("gasto", "Intereses", [])
    with pytest.raises(CategoriaDuplicada):
        C.validar_categoria("gasto", "Viajes", ["Viajes"])


def test_validar_simbolo():
    assert C.validar_simbolo(" US$ ") == "US$"
    for malo in ["", "   ", "12345", "a\nb", None, "EUR", "COP"]:
        with pytest.raises(ValueError):
            C.validar_simbolo(malo)


def test_validar_categoria_largo_maximo():
    assert C.validar_categoria("gasto", "x" * C.CATEGORIA_LARGO_MAX, []) == "x" * C.CATEGORIA_LARGO_MAX
    with pytest.raises(C.CategoriaInvalida):
        C.validar_categoria("gasto", "x" * (C.CATEGORIA_LARGO_MAX + 1), [])


def _mensaje(fn, *args):
    with pytest.raises(C.ErrorDeDominio) as e:
        fn(*args)
    return type(e.value), e.value.mensaje, e.value.status


def test_categorias_mensajes_y_status_exactos():
    assert _mensaje(C.validar_categoria, "otro", "x", []) == (C.CategoriaInvalida, "Tipo inválido", 422)
    assert _mensaje(C.validar_categoria, "gasto", "  ", []) == (C.CategoriaInvalida, "Nombre vacío", 422)
    assert _mensaje(C.validar_categoria, "gasto", None, []) == (C.CategoriaInvalida, "Nombre vacío", 422)
    assert _mensaje(C.validar_categoria, "gasto", "x" * 26, []) == (
        C.CategoriaInvalida, "Nombre demasiado largo (máximo 25 caracteres)", 422,
    )
    assert _mensaje(C.validar_categoria, "gasto", "Inversión", []) == (C.CategoriaDuplicada, "Categoría repetida", 409)
    assert _mensaje(C.validar_categoria, "gasto", " Viajes ", ["Viajes"]) == (C.CategoriaDuplicada, "Categoría repetida", 409)
    assert _mensaje(C.validar_simbolo, "EUR") == (C.ErrorDeDominio, "símbolo inválido", 400)


def test_validar_categoria_acepta_cada_tipo():
    for tipo in ("ingreso", "gasto", "transfer"):
        assert C.validar_categoria(tipo, "Nueva", []) == "Nueva"
    assert C.TIPOS == ("ingreso", "gasto", "transfer")


def test_validar_simbolo_acepta_las_monedas_y_recorta():
    for m in ("$", "US$", "€", "MX$", "£"):
        assert C.validar_simbolo(f" {m} ") == m


def test_categorias_con_custom_ignora_tipos_desconocidos_y_no_muta_el_sistema():
    cats = C.categorias_con_custom([{"tipo": "otro", "nombre": "X"}, {"tipo": "gasto", "nombre": "Viajes"}])
    assert "otro" not in cats and cats["gasto"][-1] == {"nombre": "Viajes", "sistema": False}
    assert C.categorias_con_custom([])["gasto"][-1] == {"nombre": "Compra activos", "sistema": True}
    assert C.NOMBRES_SISTEMA == {
        "Crédito recibido", "Avance de tarjeta", "Intereses", "Dividendos", "Venta activos",
        "Inversión", "Compra activos", "Pago deuda",
    }
