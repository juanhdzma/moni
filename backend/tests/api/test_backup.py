import pytest

from backend.tests.conftest import CLAVE_TEST


def importar(client, payload):
    return client.post("/api/import", json={**payload, "clave": CLAVE_TEST})


def truncar(client):
    return client.post("/api/truncate", json={"clave": CLAVE_TEST})

TX_OK = {"fecha": "2026-07-01", "tipo": "gasto", "categoria": "Mercado", "monto": 100}
INV_OK = {"nombre": "CDT", "tipo": "fija", "monto_invertido": 1000, "tasa_ea": 10, "fecha_inicio": "2026-01-01"}


def test_roundtrip_export_import(client, tarjeta):
    client.post("/api/tx", json={**TX_OK, "tarjeta_id": tarjeta["id"]})
    client.post("/api/rec", json={"nombre": "Netflix", "tipo": "gasto", "monto": 40, "frecuencia": "mensual"})
    client.post("/api/inv", json=INV_OK)
    client.post("/api/activo", json={"nombre": "Casa", "valor_inicial": 1000, "valor_actual": 1200})
    client.post("/api/categorias", json={"tipo": "gasto", "nombre": "Extra"})
    client.post("/api/ops-ocultas", json={"clave": "deuda:1:2026-01-01"})
    client.put("/api/ajustes", json={"moneda_simbolo": "US$"})
    antes = client.get("/api/backup").json()
    assert antes["ajustes"] == [{"clave": "moneda_simbolo", "valor": "US$"}]
    assert set(antes) == {"transacciones", "deudas", "inversiones", "activos", "recurrentes", "categorias", "ops_ocultas", "ajustes"}
    assert all(len(filas) == 1 for tabla, filas in antes.items() if tabla not in ("deudas", "ajustes"))

    truncar(client)
    client.put("/api/ajustes", json={"moneda_simbolo": "$"})
    vacio = client.get("/api/backup").json()
    assert all(filas == [] for tabla, filas in vacio.items() if tabla != "ajustes")

    r = importar(client, antes).json()
    assert r["counts"]["transacciones"] == 1 and r["counts"]["categorias"] == 1
    assert r["texto"].startswith("Importado: 1 deuda, 1 inversión, 1 activo")
    assert "1 operación oculta" in r["texto"]
    assert client.get("/api/backup").json() == antes


def test_import_rechaza_filas_corruptas(client):
    r = importar(client, {"transacciones": [{**TX_OK, "monto": "mucha plata"}]})
    assert r.status_code == 400
    assert "transacciones[0]" in r.json()["detail"]
    assert "Debe ser un número" in r.json()["detail"]


def test_import_viejo_sin_categorias_ni_ops_entra(client):
    r = importar(client, {"transacciones": [TX_OK]})
    assert r.status_code == 200 and r.json()["counts"]["transacciones"] == 1
    estado = client.get("/api/backup").json()
    assert [(t["fecha"], t["tipo"], t["categoria"], t["monto"]) for t in estado["transacciones"]] == [("2026-07-01", "gasto", "Mercado", 100)]
    assert estado["categorias"] == [] and estado["ops_ocultas"] == []


def test_import_corrupto_no_deja_nada_a_medias(client):
    payload = {"transacciones": [TX_OK, {**TX_OK, "tipo": "banana"}]}
    assert importar(client, payload).status_code == 400
    assert client.get("/api/backup").json()["transacciones"] == []


def test_import_inversion_sin_valor_actual_usa_el_monto_invertido(client):
    fila = {"nombre": "Fondo", "tipo": "variable", "monto_invertido": 500}
    assert importar(client, {"inversiones": [fila]}).json()["counts"]["inversiones"] == 1
    guardada = client.get("/api/backup").json()["inversiones"][0]
    assert guardada["valor_actual"] == 500
    assert guardada["fecha_inicio"] and guardada["valor_actualizado_en"] == guardada["fecha_inicio"]


def test_import_ids_duplicados_se_reporta_como_tal(client):
    fila = {**TX_OK, "id": 1}
    r = importar(client, {"transacciones": [fila, fila]})
    assert r.status_code == 400
    assert "ids duplicados" in r.json()["detail"]


def test_truncate_reinicia_ids_y_vacia_categorias_y_ops_pero_no_ajustes(client):
    client.post("/api/tx", json=TX_OK)
    client.post("/api/categorias", json={"tipo": "gasto", "nombre": "Extra"})
    client.post("/api/ops-ocultas", json={"clave": "deuda:1:2026-01-01"})
    client.put("/api/ajustes", json={"moneda_simbolo": "US$"})
    r = truncar(client)
    assert (r.status_code, r.json()) == (200, {"ok": True})
    assert client.get("/api/bootstrap").json()["categorias"]["gasto"] == [
        {"nombre": "Inversión", "sistema": True},
        {"nombre": "Compra activos", "sistema": True},
    ]
    assert client.get("/api/ops-ocultas").json() == {"items": [], "texto_vacio": "Ninguna operación oculta."}
    assert client.get("/api/bootstrap").json()["ajustes"] == {"moneda_simbolo": "US$"}
    assert client.post("/api/tx", json=TX_OK).json()["id"] == 1


def test_lectura_no_necesita_header_csrf(client):
    client.headers.pop("x-moni-request")
    r = client.get("/api/backup")
    assert r.status_code == 200 and set(r.json()) == {
        "transacciones", "deudas", "inversiones", "activos", "recurrentes", "categorias", "ops_ocultas", "ajustes",
    }


def test_import_restaura_ajustes_y_rechaza_simbolo_invalido(client):
    assert importar(client, {"ajustes": [{"clave": "moneda_simbolo", "valor": "€"}]}).status_code == 200
    assert client.get("/api/bootstrap").json()["ajustes"] == {"moneda_simbolo": "€"}
    r = importar(client, {"ajustes": [{"clave": "moneda_simbolo", "valor": "EUR"}]})
    assert r.status_code == 400 and r.json()["detail"].startswith("Fila ajustes[0] inválida")
    assert importar(client, {"ajustes": [{"clave": "otra", "valor": "x"}]}).status_code == 400


def test_import_op_oculta_invalida_es_error_de_dominio_en_espanol(client):
    r = importar(client, {"ops_ocultas": [{"clave": "x:1:2026-01-01"}]})
    assert r.status_code == 400 and r.json()["detail"].startswith("Fila ops_ocultas[0] inválida")


@pytest.mark.parametrize("categorias,fragmento", [
    ([{"tipo": "gasto", "nombre": "  "}], "Nombre vacío"),
    ([{"tipo": "gasto", "nombre": "Intereses"}], "Categoría repetida"),
    ([{"tipo": "gasto", "nombre": "x" * 26}], "demasiado largo"),
    ([{"tipo": "gasto", "nombre": "Extra"}, {"tipo": "gasto", "nombre": " Extra"}], "Categoría repetida"),
])
def test_import_valida_categorias(client, categorias, fragmento):
    r = importar(client, {"categorias": categorias})
    assert r.status_code == 400 and "categorias[" in r.json()["detail"] and fragmento in r.json()["detail"]
    assert client.get("/api/backup").json()["categorias"] == []


def test_import_categoria_valida_se_guarda_limpia(client):
    importar(client, {"categorias": [{"tipo": "gasto", "nombre": " Extra "}]})
    assert client.get("/api/backup").json()["categorias"] == [{"tipo": "gasto", "nombre": "Extra"}]


def test_import_acepta_deuda_cruda_con_es_tarjeta_y_redondea(client):
    fila = {"nombre": "Visa", "es_tarjeta": 1, "cupo": 100.5, "saldo_actual": 10.5, "tasa_ea": 12.3456, "total_intereses": 0}
    prestamo = {"nombre": "P", "es_tarjeta": 0, "saldo_actual": 100.5, "tasa_ea": 12.3456, "total_intereses": 0}
    r = importar(client, {"deudas": [fila, prestamo]})
    assert r.status_code == 200, r.json()
    visa, p = client.get("/api/backup").json()["deudas"]
    assert (visa["es_tarjeta"], visa["cupo"], visa["saldo_actual"]) == (1, 101, 11)
    assert (p["es_tarjeta"], p["saldo_actual"], p["tasa_ea"]) == (0, 101, 12.35)


def test_import_monto_que_redondea_a_cero_da_error_claro(client):
    r = importar(client, {"inversiones": [{**INV_OK, "monto_invertido": 0.4}]})
    assert r.status_code == 400 and "monto_invertido" in r.json()["detail"]


@pytest.mark.parametrize("id_malo", [0, -1, 1.5, True, "1"])
def test_import_rechaza_id_invalido(client, id_malo):
    fila = {"nombre": "A", "valor_inicial": 1000, "id": id_malo}
    r = importar(client, {"activos": [fila]})
    assert r.status_code == 400 and r.json()["detail"].startswith("Fila activos[0] inválida: id")


@pytest.mark.parametrize("valor", [-500, "5", True])
def test_import_rechaza_total_intereses_invalido(client, valor):
    fila = {"nombre": "D", "saldo_actual": 1000, "total_intereses": valor}
    r = importar(client, {"deudas": [fila]})
    assert r.status_code == 400 and "total_intereses" in r.json()["detail"]
    resumen = client.get("/api/deudas/resumen").json()
    assert resumen["creditos"] == [] and resumen["tarjetas"] == []


def test_import_acepta_id_y_total_intereses_validos(client):
    fila = {"id": 7, "nombre": "D", "saldo_actual": 1000, "total_intereses": 250.4}
    assert importar(client, {"deudas": [fila]}).status_code == 200
    d = client.get("/api/backup").json()["deudas"][0]
    assert d["id"] == 7 and d["total_intereses"] == 250


def test_import_rechaza_total_intereses_infinito(client):
    cuerpo = '{"clave": "%s", "deudas": [{"nombre": "D", "saldo_actual": 1000, "total_intereses": 1e999}]}' % CLAVE_TEST
    r = client.post("/api/import", content=cuerpo, headers={"content-type": "application/json"})
    assert r.status_code == 400 and "total_intereses" in r.json()["detail"]
    resumen = client.get("/api/deudas/resumen").json()
    assert resumen["creditos"] == [] and resumen["tarjetas"] == []


def test_import_tope_de_filas_por_coleccion(client):
    from backend.schemas.backup import FILAS_MAX_POR_COLECCION

    r = importar(client, {"categorias": [{}] * (FILAS_MAX_POR_COLECCION + 1)})
    assert r.status_code == 422
    assert f"como máximo {FILAS_MAX_POR_COLECCION} elementos" in r.json()["detail"][0]["msg"]


def test_import_texto_mas_largo_que_el_tope_falla_con_fila_y_campo(client):
    largo = {**TX_OK, "descripcion": "x" * 121}
    r = importar(client, {"transacciones": [largo]})
    assert r.status_code == 400
    assert "transacciones[0]" in r.json()["detail"] and "descripcion" in r.json()["detail"]
    assert "demasiado largo" in r.json()["detail"]


def test_import_op_oculta_con_columnas_derivadas_sigue_entrando(client):
    fila = {"clave": "deuda:1:2026-01-01", "tipo": "deuda", "fuente_id": 1, "fecha": "2026-01-01", "creada_en": ""}
    assert importar(client, {"ops_ocultas": [fila]}).status_code == 200
    assert [o["clave"] for o in client.get("/api/ops-ocultas").json()["items"]] == ["deuda:1:2026-01-01"]


def test_import_rechaza_transaccion_con_tarjeta_inexistente_o_que_no_es_tarjeta(client):
    huerfana = importar(client, {"transacciones": [{**TX_OK, "tarjeta_id": 99}]})
    assert huerfana.status_code == 400
    assert "transacciones[0]" in huerfana.json()["detail"] and "tarjeta_id" in huerfana.json()["detail"]
    prestamo = {"id": 1, "nombre": "P", "saldo_actual": 100, "clase_deuda": "prestamo"}
    assert importar(client, {"deudas": [prestamo], "transacciones": [{**TX_OK, "tarjeta_id": 1}]}).status_code == 400
    assert client.get("/api/backup").json()["transacciones"] == []


def test_import_acepta_transaccion_ligada_a_una_tarjeta_importada(client):
    tarjeta = {"id": 4, "nombre": "Visa", "saldo_actual": 100, "clase_deuda": "tarjeta", "cupo": 1000}
    r = importar(client, {"deudas": [tarjeta], "transacciones": [{**TX_OK, "tarjeta_id": 4}]})
    assert r.status_code == 200
    assert client.get("/api/backup").json()["transacciones"][0]["tarjeta_id"] == 4


def test_import_de_tx_sin_fecha_usa_el_ahora_inyectado(client):
    sin_fecha = {k: v for k, v in TX_OK.items() if k != "fecha"}
    assert importar(client, {"transacciones": [sin_fecha]}).status_code == 200
    assert client.get("/api/backup").json()["transacciones"][0]["fecha"].startswith("2026-")


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

