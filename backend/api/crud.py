from fastapi import APIRouter

from ..core.db import conexion
from ..core.sql import delete_row, get_row, insert_row, insert_tx, update_row
from ..calculos import operaciones


def _normalizar_tasa(data):
    tipo = data.pop("tasa_tipo", "ea")
    if data.get("tasa_ea"):
        data["tasa_ea"] = operaciones.convertir_tasa(data["tasa_ea"], tipo)
    return data


def register_crud(router: APIRouter, path, table, cols, model, linked_tx=None):
    @router.post(f"/api/{path}", name=f"create_{path}")
    def create(body: model):
        with conexion() as conn:
            data = _normalizar_tasa(body.model_dump())
            crear_tx = data.pop("crear_tx", False)
            new_id = insert_row(conn, table, cols, data)
            if crear_tx and linked_tx and not data.get("es_tarjeta"):
                insert_tx(
                    conn,
                    fecha=data.get(linked_tx["fecha_field"]) or "",
                    tipo=linked_tx["tipo"],
                    categoria=linked_tx["categoria"],
                    descripcion=linked_tx["desc_fn"](data),
                    monto=linked_tx["monto_fn"](data),
                    notas="",
                )
            conn.commit()
            return get_row(conn, table, new_id)

    @router.put(f"/api/{path}/{{row_id}}", name=f"update_{path}")
    def update(row_id: int, body: model):
        with conexion() as conn:
            data = _normalizar_tasa(body.model_dump())
            data.pop("crear_tx", None)
            update_row(conn, table, cols, row_id, data)
            conn.commit()
            return get_row(conn, table, row_id)

    @router.delete(f"/api/{path}/{{row_id}}", status_code=204, name=f"delete_{path}")
    def delete(row_id: int):
        with conexion() as conn:
            delete_row(conn, table, row_id)
            if table == "deudas":
                conn.execute("UPDATE transacciones SET tarjeta_id = NULL WHERE tarjeta_id = ?", (row_id,))
            conn.commit()
