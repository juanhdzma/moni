SALDO_MINIMO = 1
DIAS_DESACTUALIZADO = 30
TEXTO_DESACTUALIZADO = "Valor sin actualizar hace más de 1 mes"

TIPOS_INVERSION = [{"value": "fija", "label": "Fija"}, {"value": "variable", "label": "Variable"}]
PAGOS_INVERSION = [{"value": "mensual", "label": "Mensual"}, {"value": "vencimiento", "label": "Al vencimiento"}]
CLASES_DEUDA = [{"value": "prestamo", "label": "Préstamo"}, {"value": "tarjeta", "label": "Tarjeta"}]
TIPOS_RETIRO = [{"value": "total", "label": "Total"}, {"value": "parcial", "label": "Parcial"}]
DESTINOS_RENDIMIENTO = [
    {
        "value": "cuenta",
        "label": "Me lo pagan",
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
SERIES_EVOLUCION = [{"value": "patrimonio", "label": "Patrimonio"}, {"value": "inversiones", "label": "Inversiones"}]
ETIQUETAS_TIPO_CATEGORIA = [
    {"value": "ingreso", "label": "Ingresos"},
    {"value": "gasto", "label": "Gastos"},
    {"value": "transfer", "label": "Transferencias"},
]


DEFAULTS_FORMULARIOS = {
    "frecuencia_recurrente": "mensual",
    "tipo_inversion": "fija",
    "pago_inversion": "vencimiento",
}
TEXTO_VENTANA_AVISO = "hoy o mañana"


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
