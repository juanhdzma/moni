import sqlite3
import threading

from backend.core import db
from backend.core.sql import tiene_tx_ligadas
from backend.api.transacciones import ajustar_saldo_tarjeta


def test_indices_de_transacciones_se_usan(client):
    with db.conexion() as conn:
        plan_fecha = " ".join(r["detail"] for r in conn.execute(
            "EXPLAIN QUERY PLAN SELECT * FROM transacciones WHERE fecha >= '2026-01-01'"))
        plan_tarjeta = " ".join(r["detail"] for r in conn.execute(
            "EXPLAIN QUERY PLAN SELECT 1 FROM transacciones WHERE tarjeta_id = 1 LIMIT 1"))
        assert "idx_tx_fecha" in plan_fecha
        assert "idx_tx_tarjeta" in plan_tarjeta
        assert tiene_tx_ligadas(conn, 1) is False


def _base_vieja(path):
    conn = sqlite3.connect(path)
    conn.executescript(
        "CREATE TABLE transacciones (id INTEGER PRIMARY KEY, fecha TEXT NOT NULL, tipo TEXT NOT NULL,"
        " categoria TEXT NOT NULL, descripcion TEXT NOT NULL DEFAULT '', monto REAL NOT NULL, notas TEXT NOT NULL DEFAULT '');"
        "CREATE TABLE deudas (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, monto_inicial REAL NOT NULL, saldo_actual REAL NOT NULL,"
        " tasa_ea REAL NOT NULL DEFAULT 0, cuota_mensual REAL NOT NULL DEFAULT 0, fecha_inicio TEXT NOT NULL DEFAULT '',"
        " proxima_cuota TEXT NOT NULL DEFAULT '');"
        "CREATE TABLE inversiones (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, tipo TEXT NOT NULL, monto_invertido REAL NOT NULL,"
        " valor_actual REAL NOT NULL, tasa_ea REAL, fecha_inicio TEXT NOT NULL DEFAULT '', pago TEXT, dia_pago INTEGER);"
        "CREATE TABLE activos (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, valor_inicial REAL NOT NULL, valor_actual REAL NOT NULL,"
        " fecha_adquisicion TEXT NOT NULL DEFAULT '');"
        "INSERT INTO deudas (nombre, monto_inicial, saldo_actual) VALUES ('Vieja', 10, 10);"
    )
    conn.commit()
    conn.close()


def test_user_version_migra_una_base_vieja_y_no_repite(monkeypatch, tmp_path):
    ruta = tmp_path / "vieja.db"
    _base_vieja(ruta)
    monkeypatch.setattr(db, "DB_PATH", ruta)
    db.init_db()
    conn = db.get_conn()
    try:
        assert conn.execute("PRAGMA user_version").fetchone()[0] == len(db.MIGRATIONS)
        assert conn.execute("SELECT es_tarjeta, total_intereses FROM deudas").fetchone()[:] == (0, 0)
        assert conn.execute("SELECT COUNT(*) FROM pragma_table_info('transacciones') WHERE name='tarjeta_id'").fetchone()[0] == 1
    finally:
        conn.close()
    db.init_db()


def test_dos_hilos_sobre_la_misma_tarjeta_no_pierden_ajustes(client, tarjeta):
    barrera = threading.Barrier(2)
    errores = []

    def ajustar():
        try:
            barrera.wait()
            for _ in range(25):
                with db.conexion() as conn:
                    ajustar_saldo_tarjeta(conn, tarjeta["id"], 1000)
                    conn.commit()
        except Exception as e:
            errores.append(e)

    hilos = [threading.Thread(target=ajustar) for _ in range(2)]
    [h.start() for h in hilos]
    [h.join() for h in hilos]
    assert errores == []
    with db.conexion() as conn:
        assert conn.execute("SELECT saldo_actual FROM deudas WHERE id = ?", (tarjeta["id"],)).fetchone()[0] == 50_000
