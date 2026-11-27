def _valor_actualizado_en(datos: dict, anterior: dict | None, fecha_base: str, ahora: str) -> str:
    if datos["valor_actualizado_en"]:
        return datos["valor_actualizado_en"]
    if anterior is None:
        return fecha_base
    if anterior["valor_actual"] == datos["valor_actual"]:
        return anterior["valor_actualizado_en"]
    return ahora


def completar_inversion(datos: dict, anterior: dict | None, hoy, ahora: str) -> dict:
    if datos["valor_actual"] is None:
        datos["valor_actual"] = datos["monto_invertido"]
    datos["fecha_inicio"] = datos["fecha_inicio"] or hoy.isoformat()
    datos["valor_actualizado_en"] = _valor_actualizado_en(datos, anterior, datos["fecha_inicio"], ahora)
    return datos


def completar_activo(datos: dict, anterior: dict | None, hoy, ahora: str) -> dict:
    if datos["valor_actual"] is None:
        datos["valor_actual"] = datos["valor_inicial"]
    datos["fecha_adquisicion"] = datos["fecha_adquisicion"] or (anterior or {}).get("fecha_adquisicion") or hoy.isoformat()
    datos["valor_actualizado_en"] = _valor_actualizado_en(datos, anterior, datos["fecha_adquisicion"], ahora)
    return datos


def completar_deuda(datos: dict, hoy) -> dict:
    if not datos["es_tarjeta"]:
        datos["fecha_inicio"] = datos["fecha_inicio"] or hoy.isoformat()
    return datos


def completar_recurrente(datos: dict, anterior: dict, activo_enviado: bool) -> dict:
    if not activo_enviado:
        datos["activo"] = anterior["activo"]
    return datos
