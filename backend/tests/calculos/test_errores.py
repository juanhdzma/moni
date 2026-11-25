from backend.calculos.categorias import CategoriaDuplicada, CategoriaInvalida
from backend.calculos.errores import ErrorDeDominio


def test_error_de_dominio_status_por_defecto_y_explicito():
    e = ErrorDeDominio("falla")
    assert (e.mensaje, e.status, str(e)) == ("falla", 400, "falla")
    assert ErrorDeDominio("no existe", 404).status == 404
    assert ErrorDeDominio("x", 0).status == 0
    assert isinstance(e, ValueError)


def test_subclases_con_status_propio():
    assert CategoriaDuplicada("x").status == 409 and CategoriaInvalida("x").status == 422
    assert CategoriaDuplicada("x", 418).status == 418
