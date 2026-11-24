from ..numeros import pesos


def completar_inversion(datos: dict, anterior: dict | None, hoy, ahora: str) -> dict:
    if datos["valor_actual"] is None:
        datos["valor_actual"] = datos["monto_invertido"]
    datos["fecha_inicio"] = datos["fecha_inicio"] or hoy.isoformat()
    if not datos["valor_actualizado_en"]:
        if anterior is None:
            datos["valor_actualizado_en"] = datos["fecha_inicio"]
        elif anterior["valor_actual"] == datos["valor_actual"]:
            datos["valor_actualizado_en"] = anterior["valor_actualizado_en"]
        else:
            datos["valor_actualizado_en"] = ahora
    return datos


def completar_activo(datos: dict, anterior: dict | None, hoy, ahora: str) -> dict:
    datos["valor_inicial"] = pesos(datos["valor_inicial"])
    datos["valor_actual"] = pesos(datos["valor_actual"] or datos["valor_inicial"])
    datos["fecha_adquisicion"] = datos["fecha_adquisicion"] or (anterior or {}).get("fecha_adquisicion") or hoy.isoformat()
    if not datos["valor_actualizado_en"]:
        if anterior is None:
            datos["valor_actualizado_en"] = datos["fecha_adquisicion"]
        elif anterior["valor_actual"] == datos["valor_actual"]:
            datos["valor_actualizado_en"] = anterior["valor_actualizado_en"]
        else:
            datos["valor_actualizado_en"] = ahora
    return datos


def completar_deuda(datos: dict, hoy) -> dict:
    if not datos["es_tarjeta"]:
        datos["fecha_inicio"] = datos["fecha_inicio"] or hoy.isoformat()
    return datos
