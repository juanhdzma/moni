import datetime

HOY = datetime.date(2026, 8, 15)


def tx(tipo, categoria, monto, fecha="2026-08-10", tarjeta_id=None, id=1, descripcion=""):
    return {
        "id": id,
        "tipo": tipo,
        "categoria": categoria,
        "monto": monto,
        "fecha": fecha,
        "tarjeta_id": tarjeta_id,
        "descripcion": descripcion,
    }


def deuda(saldo_actual=0, cuota_mensual=0, es_tarjeta=False):
    return {
        "saldo_actual": saldo_actual,
        "cuota_mensual": cuota_mensual,
        "es_tarjeta": es_tarjeta,
        "vigente": es_tarjeta or saldo_actual >= 1,
    }


def inversion(valor_actual=0, monto_invertido=0, fecha_inicio=None):
    return {"valor_actual": valor_actual, "monto_invertido": monto_invertido, "fecha_inicio": fecha_inicio}


def activo(valor_actual=0):
    return {"valor_actual": valor_actual}


def estado(**kw):
    base = {"transacciones": [], "deudas": [], "inversiones": [], "activos": []}
    base.update(kw)
    return base
