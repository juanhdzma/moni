import datetime

from backend.core.ops_ocultas import podar_ocultas
from backend.core import db


def test_migrar_local_limita_tamanos(client):
    assert client.post("/api/migrar-local", json={"categorias": {"gasto": ["x" * 61]}}).status_code == 422
    assert client.post("/api/migrar-local", json={"ops_ocultas": ["x"] * 501}).status_code == 422


def test_get_proximas_operaciones_no_escribe(client):

    conn = db.get_conn()
    conn.execute("INSERT INTO ops_ocultas (clave, tipo, fuente_id, fecha, creada_en) VALUES ('deuda:99:2030-01-01', 'deuda', 99, '2030-01-01', 'x')")
    conn.commit()
    conn.close()
    assert client.get("/api/proximas-operaciones").status_code == 200
    conn = db.get_conn()
    n = conn.execute("SELECT COUNT(*) FROM ops_ocultas").fetchone()[0]
    conn.close()
    assert n == 1


def test_arranque_poda_ocultas_obsoletas(client):

    conn = db.get_conn()
    conn.execute("INSERT INTO ops_ocultas (clave, tipo, fuente_id, fecha, creada_en) VALUES ('deuda:99:2030-01-01', 'deuda', 99, '2030-01-01', 'x')")
    conn.execute("INSERT INTO recurrentes (nombre, tipo, monto, frecuencia, activo, fecha_inicio) VALUES ('r', 'gasto', 1, 'mensual', 1, '2030-01-01')")
    conn.commit()
    podar_ocultas(conn, datetime.date(2029, 12, 30))
    n = conn.execute("SELECT COUNT(*) FROM ops_ocultas").fetchone()[0]
    conn.close()
    assert n == 0
