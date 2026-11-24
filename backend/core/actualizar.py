def actualizar_columnas(conn, table, row_id, cambios):
    if not cambios:
        return
    set_clause = ", ".join(f"{c} = ?" for c in cambios)
    conn.execute(f"UPDATE {table} SET {set_clause} WHERE id = ?", [*cambios.values(), row_id])
