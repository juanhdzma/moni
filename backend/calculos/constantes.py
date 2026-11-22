SALDO_MINIMO = 1

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
