import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "moni.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS transacciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  tipo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  monto REAL NOT NULL,
  notas TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS deudas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  monto_inicial REAL NOT NULL,
  saldo_actual REAL NOT NULL,
  tasa_ea REAL NOT NULL DEFAULT 0,
  cuota_mensual REAL NOT NULL DEFAULT 0,
  fecha_inicio TEXT NOT NULL DEFAULT '',
  proxima_cuota TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inversiones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  monto_invertido REAL NOT NULL,
  valor_actual REAL NOT NULL,
  tasa_ea REAL,
  fecha_inicio TEXT NOT NULL DEFAULT '',
  pago TEXT,
  dia_pago INTEGER
);

CREATE TABLE IF NOT EXISTS activos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  valor_inicial REAL NOT NULL,
  valor_actual REAL NOT NULL,
  fecha_adquisicion TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS recurrentes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  monto REAL NOT NULL,
  frecuencia TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  fecha_inicio TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT ''
);
"""


def get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()
