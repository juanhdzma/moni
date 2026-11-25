import pytest

from backend.calculos.operaciones.textos import (
    DESCRIPCION_RENDIMIENTO,
    PREFIJOS_TX,
    categoria_sugerida,
    descripcion_tx,
    texto_activos,
    texto_estimado_aporte,
    texto_posiciones,
    texto_vacio_activos,
    texto_vacio_inversiones,
    texto_vacio_recurrentes,
)


def test_descripcion_rendimiento_es_el_contrato_de_un_solo_lado():
    assert DESCRIPCION_RENDIMIENTO == (
        "Un rendimiento cuenta de un solo lado: si capitaliza sube valor_actual sin transacción; "
        "si se paga, es un ingreso y el valor no cambia."
    )


@pytest.mark.parametrize("prefijo,texto", [
    ("inversion_nueva", "Nueva inversión"), ("aporte", "Aporte"), ("rendimiento", "Rendimiento"),
    ("retiro_total", "Retiro total"), ("retiro_parcial", "Retiro parcial"), ("compra", "Compra"), ("venta", "Venta"),
])
def test_descripcion_tx_une_prefijo_y_nombre(prefijo, texto):
    assert PREFIJOS_TX[prefijo] == texto
    assert descripcion_tx(prefijo, "CDT") == f"{texto} · CDT"


def test_texto_estimado_aporte():
    assert texto_estimado_aporte(None, "$") == "Estimado como valor actual + aporte. Ajustá si el mercado se movió."
    assert texto_estimado_aporte(1_234_567, "US$") == "Estimado: US$1.234.567. Ajustá si el mercado se movió."
    assert texto_estimado_aporte(0, "$") == "Estimado: $0. Ajustá si el mercado se movió."


CATEGORIAS = {"gasto": [{"nombre": "Comida"}, {"nombre": "Otros"}], "ingreso": [{"nombre": "Salario"}, {"nombre": "Extra"}]}


def test_categoria_sugerida_usa_el_nombre_si_existe_y_si_no_la_ultima():
    assert categoria_sugerida({"tipo": "gasto", "nombre": "Comida"}, CATEGORIAS) == "Comida"
    assert categoria_sugerida({"tipo": "gasto", "nombre": "Netflix"}, CATEGORIAS) == "Otros"
    assert categoria_sugerida({"tipo": "ingreso", "nombre": "Comida"}, CATEGORIAS) == "Extra"


def test_texto_activos_con_y_sin_variacion():
    r = {"variacion": -50, "mostrar_variacion": True}
    assert texto_activos(r, 1000, 1) == {"texto_variacion": "5,0% sobre lo pagado", "texto_conteo": "1 activo"}
    assert texto_activos({**r, "variacion": 250}, 1000, 3) == {"texto_variacion": "25,0% sobre lo pagado", "texto_conteo": "3 activos"}
    assert texto_activos({**r, "mostrar_variacion": False}, 1000, 0) == {"texto_variacion": "", "texto_conteo": "0 activos"}
    assert texto_activos(r, 0, 2)["texto_variacion"] == "0,0% sobre lo pagado"


def test_texto_posiciones_suma_fijas_y_variables():
    assert texto_posiciones({"fijas": [1, 2], "variables": [3, 4, 5]}) == "5 posiciones"
    assert texto_posiciones({"fijas": [1], "variables": []}) == "1 posición"
    assert texto_posiciones({"fijas": [], "variables": [1]}) == "1 posición"
    assert texto_posiciones({"fijas": [], "variables": []}) == "0 posiciones"


def test_textos_vacios():
    assert texto_vacio_inversiones("fijas") == {"titulo": "Sin fijas", "texto": "Agregá una con el botón + de arriba."}
    assert texto_vacio_activos() == {
        "titulo": "Sin activos",
        "texto": "Registrá propiedades, vehículos u otros bienes con el botón Nuevo activo.",
    }
    assert texto_vacio_recurrentes("gastos") == {"titulo": "Sin gastos recurrentes", "texto": "Agregá uno con el botón Nuevo."}
