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


def actualizar_columnas(conn, table, row_id, cambios):
    if not cambios:
        return
    set_clause = ", ".join(f"{c} = ?" for c in cambios)
    conn.execute(f"UPDATE {table} SET {set_clause} WHERE id = ?", [*cambios.values(), row_id])


def fijar_saldo(conn, deuda_id, saldo):
    conn.execute("UPDATE deudas SET saldo_actual = ? WHERE id = ?", (pesos(saldo), deuda_id))


def iniciar_escritura(conn):
    # toma el lock de escritura antes de leer: dos requests sobre la misma fila se serializan
    if not conn.in_transaction:
        conn.execute("BEGIN IMMEDIATE")


def sumar_al_saldo(conn, deuda_id, delta):
    conn.execute("UPDATE deudas SET saldo_actual = ROUND(saldo_actual + ?) WHERE id = ?", (delta, deuda_id))


def aplicar_pago_deuda(conn, deuda_id, saldo, intereses, proxima_cuota):
    conn.execute(
        "UPDATE deudas SET saldo_actual = ?, total_intereses = total_intereses + ?,"
        " proxima_cuota = COALESCE(?, proxima_cuota) WHERE id = ?",
        (saldo, intereses, proxima_cuota, deuda_id),
    )


def tiene_tx_ligadas(conn, tarjeta_id) -> bool:
    return conn.execute("SELECT 1 FROM transacciones WHERE tarjeta_id = ? LIMIT 1", (tarjeta_id,)).fetchone() is not None


def desligar_tx(conn, tarjeta_id):
    conn.execute("UPDATE transacciones SET tarjeta_id = NULL WHERE tarjeta_id = ?", (tarjeta_id,))
