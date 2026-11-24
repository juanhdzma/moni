from ..fechas import redondear_js
from ..formato import porcentaje_texto
from .finanzas import convertir_tasa, ea_a_mv


def normalizar_tasa(datos: dict) -> dict:
    tipo = datos.pop("tasa_tipo", "ea")
    if datos.get("tasa_ea"):
        datos["tasa_ea"] = redondear_js(convertir_tasa(datos["tasa_ea"], tipo) * 100) / 100
    return datos


def equivalencia_tasa(valor: float, tipo: str) -> dict:
    if valor <= 0:
        return {"ea": None, "mv": None, "texto": None}
    ea = convertir_tasa(valor, tipo)
    mv = valor if tipo == "mv" else ea_a_mv(ea)
    equivalente = f"{porcentaje_texto(mv, 4)}% MV" if tipo == "ea" else f"{porcentaje_texto(ea, 2)}% EA"
    return {"ea": ea, "mv": mv, "texto": f"Equivale a {equivalente}"}
