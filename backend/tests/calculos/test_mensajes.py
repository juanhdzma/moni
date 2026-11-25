import pytest
from pydantic_core.core_schema import ErrorType
from typing import get_args

from backend.core.mensajes import MENSAJE_GENERICO, MENSAJES, mensaje_en_espanol

CON_MENSAJE_PROPIO = {"value_error"}


@pytest.mark.parametrize("tipo", [t for t in get_args(ErrorType) if t not in MENSAJES and t not in CON_MENSAJE_PROPIO])
def test_tipo_sin_traduccion_cae_en_generico_en_espanol(tipo):
    assert mensaje_en_espanol({"type": tipo, "msg": "Input should be english", "ctx": {}}) == MENSAJE_GENERICO


@pytest.mark.parametrize("tipo", ["float_type", "model_type", "int_type", "bool_type", "list_type", "dict_type", "extra_forbidden"])
def test_tipos_comunes_tienen_mensaje_propio(tipo):
    assert tipo in MENSAJES
    assert mensaje_en_espanol({"type": tipo, "msg": "english", "ctx": {}}) != "english"


def test_value_error_conserva_el_mensaje_del_validador_sin_prefijo():
    assert mensaje_en_espanol({"type": "value_error", "msg": "Value error, Saldo requerido"}) == "Saldo requerido"
