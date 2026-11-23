from .finanzas import convertir_tasa


def normalizar_tasa(datos: dict) -> dict:
    tipo = datos.pop("tasa_tipo", "ea")
    if datos.get("tasa_ea"):
        datos["tasa_ea"] = convertir_tasa(datos["tasa_ea"], tipo)
    return datos
