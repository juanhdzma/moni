import datetime

D = datetime.date


def fecha(s):
    return datetime.date.fromisoformat(s)


def deuda(id=1, nombre="Deuda", saldo_actual=100, cuota_mensual=10, proxima_cuota="", **kw):
    return {"id": id, "nombre": nombre, "saldo_actual": saldo_actual, "cuota_mensual": cuota_mensual,
            "proxima_cuota": proxima_cuota, "monto_inicial": 1000, "total_intereses": 0, "tasa_ea": 0, **kw}


def inversion(id=1, nombre="Inv", **kw):
    return {"id": id, "nombre": nombre, "tipo": "fija", "pago": "mensual", "dia_pago": 20, "tasa_ea": 12,
            "monto_invertido": 1_000_000, "valor_actual": 1_000_000, **kw}


def recurrente(id=1, nombre="Rec", **kw):
    return {"id": id, "nombre": nombre, "tipo": "gasto", "monto": 100, "frecuencia": "mensual",
            "fecha_inicio": "2026-01-18", "activo": 1, **kw}
