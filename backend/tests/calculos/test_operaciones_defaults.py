import datetime

from backend.calculos import operaciones

HOY = datetime.date(2026, 7, 1)
AHORA = "2026-07-01T10:00"


def _inv(**kw):
    return {"monto_invertido": 500, "valor_actual": None, "fecha_inicio": "", "valor_actualizado_en": "", **kw}


def test_inversion_nueva_completa_valores():
    d = operaciones.completar_inversion(_inv(), None, HOY, AHORA)
    assert d["valor_actual"] == 500 and d["fecha_inicio"] == "2026-07-01" and d["valor_actualizado_en"] == "2026-07-01"


def test_inversion_update_conserva_fecha_si_mismo_valor_y_usa_hoy_si_cambia():
    anterior = {"valor_actual": 500, "valor_actualizado_en": "2026-01-05"}
    assert operaciones.completar_inversion(_inv(fecha_inicio="2026-01-01"), anterior, HOY, AHORA)["valor_actualizado_en"] == "2026-01-05"
    assert operaciones.completar_inversion(_inv(valor_actual=600), anterior, HOY, AHORA)["valor_actualizado_en"] == AHORA


def _activo(**kw):
    return {"valor_inicial": 100, "valor_actual": 0, "fecha_adquisicion": "", "valor_actualizado_en": "", **kw}


def test_activo_nuevo_y_update():
    d = operaciones.completar_activo(_activo(), None, HOY, "2026-07-01T10:00")
    assert d["valor_actual"] == 100 and d["valor_actualizado_en"] == "2026-07-01"
    anterior = {"valor_actual": 100, "valor_actualizado_en": "2026-02-01", "fecha_adquisicion": "2026-01-01"}
    assert operaciones.completar_activo(_activo(), anterior, HOY, "x")["valor_actualizado_en"] == "2026-02-01"
    d = operaciones.completar_activo(_activo(valor_actual=150), anterior, HOY, "ahora")
    assert d["valor_actualizado_en"] == "ahora" and d["fecha_adquisicion"] == "2026-01-01"


def test_textos():
    assert operaciones.texto_posiciones({"fijas": [1], "variables": []}) == "1 posición"
    assert operaciones.texto_activos({"variacion": 0, "mostrar_variacion": False}, 0, 2) == {"texto_variacion": "", "texto_conteo": "2 activos"}
    cats = {"gasto": [{"nombre": "A"}, {"nombre": "Z"}]}
    assert operaciones.categoria_sugerida({"tipo": "gasto", "nombre": "A"}, cats) == "A"
    assert operaciones.categoria_sugerida({"tipo": "gasto", "nombre": "Q"}, cats) == "Z"
