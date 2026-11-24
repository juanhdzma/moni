from ..calculos.errores import ErrorDeDominio
from ..calculos.numeros import pesos
from .tablas import TX_COLS

ENTIDADES = {
    "transacciones": "Movimiento",
    "deudas": "Deuda",
    "inversiones": "Inversión",
    "activos": "Activo",
    "recurrentes": "Recurrente",
}


def _no_encontrado(table, row_id):
    return ErrorDeDominio(f"{ENTIDADES.get(table, 'Registro')} {row_id} no encontrado", 404)


def insert_row(conn, table, cols, values):
    col_list = ", ".join(cols)
    placeholders = ", ".join("?" * len(cols))
    cur = conn.execute(
        f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})",
        [values.get(c) for c in cols],
    )
    return cur.lastrowid


def insert_tx(conn, **campos):
    return insert_row(conn, "transacciones", TX_COLS, campos)


def update_row(conn, table, cols, row_id, values):
    set_clause = ", ".join(f"{c} = ?" for c in cols)
    cur = conn.execute(
        f"UPDATE {table} SET {set_clause} WHERE id = ?",
        [values.get(c) for c in cols] + [row_id],
    )
    if cur.rowcount == 0:
        raise _no_encontrado(table, row_id)


def get_row(conn, table, row_id):
    row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (row_id,)).fetchone()
    if row is None:
        raise _no_encontrado(table, row_id)
    return dict(row)


def guardar_y_leer(conn, table, row_id):
    conn.commit()
    return get_row(conn, table, row_id)


def delete_row(conn, table, row_id):
    cur = conn.execute(f"DELETE FROM {table} WHERE id = ?", (row_id,))
    if cur.rowcount == 0:
        raise _no_encontrado(table, row_id)


def fijar_saldo(conn, deuda_id, saldo):
    conn.execute("UPDATE deudas SET saldo_actual = ? WHERE id = ?", (pesos(saldo), deuda_id))
