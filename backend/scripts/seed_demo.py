"""Serve Moni on a throwaway SQLite file filled with fictional data (for docs screenshots).

    python -m backend.scripts.seed_demo --db /tmp/moni_demo.db --port 8765 --password demo-password-123

Never touches backend/data/moni.db: it swaps db.DB_PATH before the app starts.
"""
import argparse
import datetime
import os
import random
from pathlib import Path

from ..calculos.base.fechas import hoy_bogota, sumar_meses
from ..core import db


def _dia(hoy: datetime.date, meses_atras: int, dia: int) -> str:
    return sumar_meses(hoy, -meses_atras, dia).isoformat()


def _transacciones(hoy: datetime.date) -> list[dict]:
    azar = random.Random(7)
    filas = []

    def tx(fecha, tipo, categoria, descripcion, monto, tarjeta_id=None):
        if fecha <= hoy.isoformat():
            filas.append({"fecha": fecha, "tipo": tipo, "categoria": categoria, "descripcion": descripcion,
                          "monto": monto, "tarjeta_id": tarjeta_id})

    for m in range(6, -1, -1):
        tx(_dia(hoy, m, 1), "ingreso", "Salario", "Nómina", 6_800_000)
        tx(_dia(hoy, m, 3), "gasto", "Arriendo", "Arriendo apartamento", 1_600_000)
        tx(_dia(hoy, m, 5), "gasto", "Servicios", "Internet y luz", azar.randint(260, 340) * 1000)
        tx(_dia(hoy, m, 6), "gasto", "Salud", "Medicina prepagada", 310_000)
        tx(_dia(hoy, m, 14), "gasto", "Ocio", "Netflix", 45_000, 1)
        for d in (4, 12, 20):
            tx(_dia(hoy, m, d), "gasto", "Mercado", "Supermercado", azar.randint(150, 280) * 1000)
        for d in (7, 15, 23):
            tx(_dia(hoy, m, d), "gasto", "Transporte", "Gasolina y peajes", azar.randint(80, 160) * 1000)
        for d in (9, 18):
            tx(_dia(hoy, m, d), "gasto", "Ocio", "Cine y salidas", azar.randint(60, 190) * 1000, 1)
        tx(_dia(hoy, m, 10), "transfer", "Pago deuda", "Cuota préstamo vehículo", 780_000)
        if m % 3 == 0:
            tx(_dia(hoy, m, 16), "ingreso", "Intereses", "Rendimiento CDT", 91_125)
    return filas


def payload(hoy: datetime.date) -> dict:
    return {
        "transacciones": _transacciones(hoy),
        "deudas": [
            {"id": 1, "nombre": "Tarjeta Visa", "clase_deuda": "tarjeta", "saldo_actual": 1_850_000,
             "cupo": 8_000_000, "franquicia": "Visa", "total_intereses": 0},
            {"id": 2, "nombre": "Préstamo vehículo", "clase_deuda": "prestamo", "monto_inicial": 28_000_000,
             "saldo_actual": 19_400_000, "tasa_ea": 17.5, "cuota_mensual": 780_000,
             "total_intereses": 1_900_000, "fecha_inicio": _dia(hoy, 14, 10), "proxima_cuota": (hoy + datetime.timedelta(days=5)).isoformat()},
        ],
        "inversiones": [
            {"id": 1, "nombre": "CDT a 12 meses", "tipo": "fija", "monto_invertido": 10_000_000,
             "valor_actual": 10_450_000, "tasa_ea": 11.2, "fecha_inicio": _dia(hoy, 4, 16), "pago": "vencimiento"},
            {"id": 2, "nombre": "CDT rendimiento mensual", "tipo": "fija", "monto_invertido": 6_000_000,
             "valor_actual": 6_000_000, "tasa_ea": 10.4, "fecha_inicio": _dia(hoy, 6, 15), "pago": "mensual",
             "dia_pago": 15},
            {"id": 3, "nombre": "Fondo de inversión", "tipo": "variable", "monto_invertido": 4_000_000,
             "valor_actual": 4_380_000, "fecha_inicio": _dia(hoy, 8, 2)},
        ],
        "activos": [
            {"id": 1, "nombre": "Apartamento", "valor_inicial": 240_000_000, "valor_actual": 262_000_000,
             "fecha_adquisicion": _dia(hoy, 30, 1)},
            {"id": 2, "nombre": "Moto", "valor_inicial": 9_000_000, "valor_actual": 7_400_000,
             "fecha_adquisicion": _dia(hoy, 20, 1)},
        ],
        "recurrentes": [
            {"id": 1, "nombre": "Nómina", "tipo": "ingreso", "monto": 6_800_000, "frecuencia": "mensual",
             "fecha_inicio": _dia(hoy, 12, 1)},
            {"id": 2, "nombre": "Arriendo", "tipo": "gasto", "monto": 1_600_000, "frecuencia": "mensual",
             "fecha_inicio": _dia(hoy, 12, 3)},
            {"id": 3, "nombre": "Netflix", "tipo": "gasto", "monto": 45_000, "frecuencia": "mensual",
             "fecha_inicio": _dia(hoy, 12, hoy.day)},
            {"id": 4, "nombre": "Gimnasio", "tipo": "gasto", "monto": 120_000, "frecuencia": "mensual",
             "fecha_inicio": _dia(hoy, 8, 20)},
            {"id": 5, "nombre": "Seguro vehículo", "tipo": "gasto", "monto": 1_200_000, "frecuencia": "anual",
             "fecha_inicio": _dia(hoy, 4, 25)},
        ],
    }


def sembrar() -> None:
    from ..core.backup import insertar_import, validar_import

    db.init_db()
    with db.conexion() as conn:
        insertar_import(conn, validar_import(payload(hoy_bogota())))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True, type=Path)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()
    if args.db.exists():
        raise SystemExit(f"{args.db} ya existe, usá una ruta nueva")

    db.DB_PATH = args.db.resolve()
    from ..seguridad.password import hash_clave

    os.environ["MONI_PASSWORD_HASH"] = hash_clave(args.password)
    sembrar()

    import uvicorn

    from ..main import app

    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
