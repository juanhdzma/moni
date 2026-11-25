from .test_backup import importar

OP = {"clave": "deuda:1:2026-01-01"}


def _backup(client):
    return client.get("/api/backup").json()


def test_el_aviso_de_truncate_nombra_todas_las_entidades_en_orden(client):
    truncate = client.get("/api/meta").json()["truncate"]
    assert truncate == {
        "palabra": "BORRAR",
        "texto": (
            "Esto borra permanentemente todas las deudas, inversiones, activos, recurrentes, transacciones, "
            "categorías y operaciones ocultas. Se conservan los ajustes y las suscripciones push."
        ),
        "entidades": ["deudas", "inversiones", "activos", "recurrentes", "transacciones", "categorías", "operaciones ocultas"],
    }


def test_una_fila_con_varios_errores_los_junta_con_punto_y_coma_y_el_campo(client):
    fila = {"fecha": "x", "tipo": "banana", "categoria": "c", "monto": "m"}
    r = importar(client, {"transacciones": [fila]})
    assert r.status_code == 400
    assert r.json()["detail"] == (
        "Fila transacciones[0] inválida: fecha: fecha debe ser YYYY-MM-DD o YYYY-MM-DDTHH:MM; "
        "tipo: Opción inválida; monto: Debe ser un número"
    )


def test_un_campo_extra_invalido_lleva_fila_campo_y_mensaje_en_espanol(client):
    r = importar(client, {"deudas": [{"nombre": "D", "saldo_actual": 10, "total_intereses": -5}]})
    assert r.status_code == 400
    assert r.json()["detail"].startswith("Fila deudas[0] inválida: total_intereses: ")
    assert len(r.json()["detail"]) > len("Fila deudas[0] inválida: total_intereses: ")


def test_op_oculta_sin_creada_en_recibe_el_ahora_de_bogota(client):
    importar(client, {"ops_ocultas": [{**OP, "creada_en": ""}]})
    assert _backup(client)["ops_ocultas"][0]["creada_en"] == "2026-07-15T10:30"


def test_op_oculta_con_creada_en_la_conserva(client):
    importar(client, {"ops_ocultas": [{**OP, "creada_en": "2026-01-02T03:04"}]})
    assert _backup(client)["ops_ocultas"][0]["creada_en"] == "2026-01-02T03:04"


def test_op_oculta_con_clave_mala_dice_cual_es_el_problema(client):
    r = importar(client, {"ops_ocultas": [{"clave": "deuda:1:2026-13-45"}]})
    assert r.status_code == 400
    assert r.json()["detail"].startswith("Fila ops_ocultas[0] inválida: ")


def test_deuda_con_clase_deuda_ignora_es_tarjeta_en_la_misma_fila(client):
    fila = {"nombre": "V", "clase_deuda": "tarjeta", "es_tarjeta": 0, "cupo": 50, "total_intereses": 0}
    assert importar(client, {"deudas": [fila]}).status_code == 200
    assert _backup(client)["deudas"][0]["es_tarjeta"] == 1


def test_deuda_con_solo_es_tarjeta_deriva_la_clase(client):
    fila = {"nombre": "V", "es_tarjeta": 1, "cupo": 50, "total_intereses": 0}
    assert importar(client, {"deudas": [fila]}).status_code == 200
    assert client.get("/api/deudas/resumen").json()["tarjetas"][0]["clase_deuda"] == "tarjeta"

