MENSAJES = {
    "missing": lambda e: "Este valor es requerido",
    "greater_than": lambda e: f"Debe ser mayor que {e['ctx']['gt']:g}",
    "greater_than_equal": lambda e: f"Debe ser mayor o igual que {e['ctx']['ge']:g}",
    "less_than": lambda e: f"Debe ser menor que {e['ctx']['lt']:g}",
    "less_than_equal": lambda e: f"Debe ser menor o igual que {e['ctx']['le']:g}",
    "string_too_long": lambda e: f"Es demasiado largo (máximo {e['ctx']['max_length']} caracteres)",
    "string_too_short": lambda e: "No puede estar vacío"
    if e["ctx"]["min_length"] == 1
    else f"Es demasiado corto (mínimo {e['ctx']['min_length']} caracteres)",
    "string_pattern_mismatch": lambda e: "Formato inválido",
    "literal_error": lambda e: "Opción inválida",
    "enum": lambda e: "Opción inválida",
    "finite_number": lambda e: "Debe ser un número finito",
    "float_parsing": lambda e: "Debe ser un número",
    "int_parsing": lambda e: "Debe ser un número entero",
    "bool_parsing": lambda e: "Debe ser verdadero o falso",
    "string_type": lambda e: "Debe ser texto",
    "json_invalid": lambda e: "El cuerpo de la solicitud no es un JSON válido",
}
PREFIJO_VALOR = "Value error, "


def mensaje_en_espanol(error: dict) -> str:
    traductor = MENSAJES.get(error["type"])
    if traductor:
        return traductor(error)
    return error["msg"].removeprefix(PREFIJO_VALOR)
