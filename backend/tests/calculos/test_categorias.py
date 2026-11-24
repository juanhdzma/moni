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
    for malo in ["", "   ", "12345", "a\nb", None]:
        with pytest.raises(ValueError):
            C.validar_simbolo(malo)
