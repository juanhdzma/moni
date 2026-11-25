SALDO_MINIMO = 1
DIAS_DESACTUALIZADO = 30
TEXTO_DESACTUALIZADO = "Valor sin actualizar hace más de 1 mes"

TIPOS_TX = [
    {"value": "ingreso", "label": "Ingreso"},
    {"value": "gasto", "label": "Gasto"},
    {"value": "transfer", "label": "Auto"},
]
TIPOS_INVERSION = [
    {"value": "fija", "label": "Fija", "tono": "ingreso", "campos": ["tasa", "pago"]},
    {"value": "variable", "label": "Variable", "tono": "gasto", "campos": []},
]
PAGOS_INVERSION = [
    {"value": "mensual", "label": "Mensual", "tono": "ingreso", "requiere_dia": True},
    {"value": "vencimiento", "label": "Al vencimiento", "requiere_dia": False},
]
TIPOS_TASA = [{"value": "ea", "label": "EA"}, {"value": "mv", "label": "MV"}]
CLASES_DEUDA = [
    {"value": "prestamo", "label": "Préstamo", "es_tarjeta": False},
    {"value": "tarjeta", "label": "Tarjeta", "es_tarjeta": True},
]
FRANQUICIAS = [
    {"value": "Visa", "label": "Visa"},
    {"value": "Mastercard", "label": "Mastercard"},
    {"value": "Amex", "label": "Amex"},
    {"value": "Otra", "label": "Otra"},
    {"value": "", "label": "Ninguna"},
]
MODOS_PAGO = [
    {"value": "cuota", "label": "Pagar cuota", "placeholder_notas": "Ej. Cuota #14"},
    {"value": "abono", "label": "Abonar", "placeholder_notas": "Ej. Abono extraordinario"},
    {"value": "liquidar", "label": "Liquidar", "placeholder_notas": "Liquidar la deuda"},
]
TIPOS_RETIRO = [{"value": "total", "label": "Total", "tono": "ingreso"}, {"value": "parcial", "label": "Parcial"}]
DESTINOS_RENDIMIENTO = [
    {
        "value": "cuenta",
        "label": "Me lo pagan",
        "tono": "ingreso",
        "hint": "Entra como ingreso a tu cartera. El valor de la inversión no cambia.",
    },
    {
        "value": "capitaliza",
        "label": "Capitaliza",
        "hint": "Sube el valor de la inversión. No entra plata a tu cartera.",
    },
]
MONEDAS = [
    {"value": "$", "label": "Peso colombiano ($)"},
    {"value": "US$", "label": "Dólar (US$)"},
    {"value": "€", "label": "Euro (€)"},
    {"value": "MX$", "label": "Peso mexicano (MX$)"},
    {"value": "£", "label": "Libra esterlina (£)"},
]
SERIES_EVOLUCION = [
    {"value": "patrimonio", "label": "Patrimonio", "tono": "cartera"},
    {"value": "inversiones", "label": "Inversiones", "tono": "inversiones"},
]
ETIQUETAS_TIPO_CATEGORIA = [
    {"value": "ingreso", "label": "Ingresos", "tono": "ingreso"},
    {"value": "gasto", "label": "Gastos", "tono": "gasto"},
    {"value": "transfer", "label": "Transferencias", "tono": "transfer"},
]


DEFAULTS_FORMULARIOS = {
    "frecuencia_recurrente": "mensual",
    "tipo_inversion": "fija",
    "pago_inversion": "vencimiento",
    "tipo_tasa": "ea",
    "clase_deuda": "prestamo",
    "franquicia": "Visa",
    "tipo_retiro": "total",
    "periodo_gastos": "1M",
    "periodo_evolucion": "6M",
    "serie_evolucion": "patrimonio",
    "orden_tx": {"col": "fecha", "dir": -1},
}

NOMBRE_LARGO_MAX = 40
DESCRIPCION_LARGO_MAX = 120
NOTAS_LARGO_MAX = 200
DIA_PAGO_MAX = 31
LIMITES = {
    "nombre": NOMBRE_LARGO_MAX,
    "descripcion": DESCRIPCION_LARGO_MAX,
    "notas": NOTAS_LARGO_MAX,
    "dia_pago_max": DIA_PAGO_MAX,
}

PALABRA_TRUNCATE = "BORRAR"
TEXTO_VENTANA_AVISO = "hoy o mañana"


def frase_aviso_diario(hora: str) -> str:
    return f"Aviso diario a las {hora} de las cuotas, rendimientos y recurrentes que vencen {TEXTO_VENTANA_AVISO}."


def clase_deuda_de(es_tarjeta) -> str:
    return "tarjeta" if es_tarjeta else "prestamo"


def valores(opciones: list[dict]) -> tuple:
    return tuple(o["value"] for o in opciones)


CATEGORIA_LARGO_MAX = 25

CATEGORIAS_SISTEMA = {
    "ingreso": {
        "credito_recibido": "Crédito recibido",
        "avance_tarjeta": "Avance de tarjeta",
        "intereses": "Intereses",
        "dividendos": "Dividendos",
        "venta_activos": "Venta activos",
    },
    "gasto": {
        "inversion": "Inversión",
        "compra_activos": "Compra activos",
    },
    "transfer": {
        "pago_deuda": "Pago deuda",
    },
}


def tiene_saldo(deuda):
    return deuda["saldo_actual"] >= SALDO_MINIMO
