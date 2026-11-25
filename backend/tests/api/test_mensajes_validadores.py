import pytest

from backend.schemas.validadores import validar_fecha

MSG_FECHA = "fecha debe ser YYYY-MM-DD o YYYY-MM-DDTHH:MM"
MSG_CLAVE = "clave de operación inválida"
INV = {"nombre": "CDT", "tipo": "fija", "monto_invertido": 1000}
DEUDA = {"nombre": "Credito", "saldo_actual": 100}
REC = {"nombre": "Netflix", "tipo": "gasto", "monto": 100, "frecuencia": "mensual"}
ACTIVO = {"nombre": "Casa", "valor_inicial": 1000}
TX = {"tipo": "gasto", "categoria": "Mercado", "monto": 100}

CAMPOS_FECHA_OPCIONAL = [
    ("/api/inv", INV, "fecha_inicio"),
    ("/api/inv", INV, "valor_actualizado_en"),
    ("/api/deuda", DEUDA, "fecha_inicio"),
    ("/api/deuda", DEUDA, "proxima_cuota"),
    ("/api/rec", REC, "fecha_inicio"),
    ("/api/activo", ACTIVO, "fecha_adquisicion"),
    ("/api/activo", ACTIVO, "valor_actualizado_en"),
    ("/api/deuda/1/pago", {"modo": "abono", "nuevo_saldo": 0, "total_pagado": 10}, "fecha"),
    ("/api/deuda/1/adelanto", {"monto": 10, "nuevo_saldo": 0}, "fecha"),
    ("/api/inv/1/rendimiento", {"monto": 10}, "fecha"),
    ("/api/inv/1/aporte", {"monto": 10}, "fecha"),
    ("/api/inv/1/retiro", {"tipo": "parcial", "monto": 10}, "fecha"),
    ("/api/inv/1/valor", {"nuevo_valor": 10}, "fecha"),
    ("/api/activo/1/venta", {"precio": 10}, "fecha"),
    ("/api/activo/1/valor", {"nuevo_valor": 10}, "fecha"),
]
IDS_FECHA = [f"{r}:{c}" for r, _, c in CAMPOS_FECHA_OPCIONAL]

CAMPOS_CLAVE = [
    ("/api/tx", TX, "op_clave"),
    ("/api/ops-ocultas", {}, "clave"),
    ("/api/deuda/1/pago", {"modo": "abono", "nuevo_saldo": 0, "total_pagado": 10}, "op_clave"),
    ("/api/deuda/1/adelanto", {"monto": 10, "nuevo_saldo": 0}, "op_clave"),
    ("/api/inv/1/rendimiento", {"monto": 10}, "op_clave"),
    ("/api/inv/1/aporte", {"monto": 10}, "op_clave"),
    ("/api/inv/1/retiro", {"tipo": "parcial", "monto": 10}, "op_clave"),
    ("/api/inv/1/valor", {"nuevo_valor": 10}, "op_clave"),
    ("/api/activo/1/venta", {"precio": 10}, "op_clave"),
    ("/api/activo/1/valor", {"nuevo_valor": 10}, "op_clave"),
]
IDS_CLAVE = [f"{r}:{c}" for r, _, c in CAMPOS_CLAVE]


def _primer_error(r):
    assert r.status_code == 422, r.text
    return r.json()["detail"][0]


@pytest.mark.parametrize("ruta,base,campo", CAMPOS_FECHA_OPCIONAL, ids=IDS_FECHA)
@pytest.mark.parametrize("basura", ["ayer", "2026-13-45", "01/07/2026x"])
def test_fecha_opcional_invalida_da_el_mensaje_exacto(client, ruta, base, campo, basura):
    e = _primer_error(client.post(ruta, json={**base, campo: basura}))
    assert e["loc"] == ["body", campo]
    assert e["msg"] == MSG_FECHA


@pytest.mark.parametrize("ruta,base,campo", CAMPOS_FECHA_OPCIONAL, ids=IDS_FECHA)
def test_fecha_opcional_vacia_o_blanca_no_es_error_de_validacion(client, ruta, base, campo):
    for vacia in ("", "   "):
        r = client.post(ruta, json={**base, campo: vacia})
        assert r.status_code != 422, (vacia, r.text)


@pytest.mark.parametrize("fecha", ["", "   ", "\t"])
def test_fecha_requerida_de_tx_vacia_dice_fecha_requerida(client, fecha):
    e = _primer_error(client.post("/api/tx", json={**TX, "fecha": fecha}))
    assert e["loc"] == ["body", "fecha"] and e["msg"] == "fecha requerida"


def test_fecha_requerida_de_tx_invalida_dice_el_formato(client):
    assert _primer_error(client.post("/api/tx", json={**TX, "fecha": "mañana"}))["msg"] == MSG_FECHA


def test_fecha_de_tx_se_recorta_y_normaliza(client):
    r = client.post("/api/tx", json={**TX, "fecha": "  2026-07-01  "})
    assert r.status_code == 200 and r.json()["fecha"] == "2026-07-01"


def test_fecha_de_tx_omitida_toma_el_instante_de_bogota(client):
    r = client.post("/api/tx", json=TX)
    assert r.status_code == 200 and len(r.json()["fecha"]) == len("2026-07-01T14:30")


@pytest.mark.parametrize(
    "ruta,base,campo",
    [
        ("/api/rec", REC, "fecha_inicio"),
        ("/api/activo", ACTIVO, "fecha_adquisicion"),
        ("/api/deuda", DEUDA, "fecha_inicio"),
    ],
)
def test_fecha_opcional_valida_se_normaliza_y_vacia_se_guarda_vacia(client, ruta, base, campo):
    ok = client.post(ruta, json={**base, campo: " 2026-07-01 14:30:59 "})
    assert ok.status_code == 200
    assert client.get("/api/backup").json()[{"/api/rec": "recurrentes", "/api/activo": "activos", "/api/deuda": "deudas"}[ruta]][0][campo] == "2026-07-01T14:30"


@pytest.mark.parametrize("ruta,base,campo", CAMPOS_CLAVE, ids=IDS_CLAVE)
@pytest.mark.parametrize("clave", ["basura", "deuda:1:2026-13-45", "x:1:2026-01-01:extra"])
def test_clave_invalida_da_el_mensaje_exacto(client, ruta, base, campo, clave):
    e = _primer_error(client.post(ruta, json={**base, campo: clave}))
    assert e["loc"] == ["body", campo]
    assert e["msg"] == MSG_CLAVE


@pytest.mark.parametrize("ruta,base,campo", [c for c in CAMPOS_CLAVE if c[0] != "/api/ops-ocultas"], ids=[i for i in IDS_CLAVE if "ocultas" not in i])
def test_clave_opcional_acepta_nulo_y_ausente(client, ruta, base, campo):
    for cuerpo in (base, {**base, campo: None}):
        assert client.post(ruta, json=cuerpo).status_code != 422


def test_ops_ocultas_clave_requerida_y_valida(client):
    assert client.post("/api/ops-ocultas", json={"clave": "deuda:1:2026-01-01"}).status_code == 201
    assert _primer_error(client.post("/api/ops-ocultas", json={}))["msg"] == "Este valor es requerido"


def test_monto_que_redondea_a_cero_dice_debe_ser_mayor_que_0(client):
    e = _primer_error(client.post("/api/tx", json={**TX, "monto": 0.4}))
    assert e["loc"] == ["body", "monto"] and e["msg"] == "Debe ser mayor que 0"


@pytest.mark.parametrize("ruta,base,campo", [("/api/activo", ACTIVO, "valor_inicial"), ("/api/inv", INV, "monto_invertido"), ("/api/rec", REC, "monto")])
def test_monto_pesos_redondea_a_cero_en_cada_entidad(client, ruta, base, campo):
    e = _primer_error(client.post(ruta, json={**base, campo: 0.4}))
    assert e["loc"] == ["body", campo] and e["msg"] == "Debe ser mayor que 0"


def test_monto_cero_redondea_half_up_y_admite_cero(client):
    d = client.post("/api/deuda", json={**DEUDA, "saldo_actual": 10.5, "cuota_mensual": 0.4}).json()
    assert d["saldo_actual"] == 11 and d["cuota_mensual"] == 0
    e = _primer_error(client.post("/api/deuda", json={**DEUDA, "saldo_actual": -1}))
    assert e["msg"] == "Debe ser mayor o igual que 0"


def test_nombre_vacio_o_largo_en_espanol(client):
    assert _primer_error(client.post("/api/activo", json={**ACTIVO, "nombre": "   "}))["msg"] == "No puede estar vacío"


@pytest.mark.parametrize("valor,requerida,esperado", [("", False, ""), ("   ", False, ""), (None, False, ""), ("2026-07-01", True, "2026-07-01"),
                                                      (" 2026-07-01 14:30:59 ", False, "2026-07-01T14:30")])
def test_validar_fecha_devuelve_el_valor_normalizado(valor, requerida, esperado):
    assert validar_fecha(valor, requerida=requerida) == esperado


@pytest.mark.parametrize("valor", ["", "   ", None])
def test_validar_fecha_requerida_vacia_lanza_fecha_requerida(valor):
    with pytest.raises(ValueError, match="^fecha requerida$"):
        validar_fecha(valor, requerida=True)


def test_validar_fecha_invalida_lanza_el_mensaje_de_formato():
    with pytest.raises(ValueError, match="^fecha debe ser YYYY-MM-DD o YYYY-MM-DDTHH:MM$"):
        validar_fecha("2026-13-45", requerida=False)


@pytest.mark.parametrize("monto", [0.5, 1, 1.4])
def test_monto_de_un_peso_o_que_redondea_a_uno_se_acepta(client, monto):
    r = client.post("/api/tx", json={**TX, "monto": monto})
    assert r.status_code == 200 and r.json()["monto"] == 1


def test_fecha_requerida_y_fecha_opcional_como_validadores_de_campo():
    from pydantic import ValidationError

    from backend.schemas.validadores import Entrada, fecha_opcional, fecha_requerida

    class Modelo(Entrada):
        obligatoria: str
        libre: str = ""

        _v_req = fecha_requerida("obligatoria")
        _v_opc = fecha_opcional("libre")

    assert Modelo(obligatoria=" 2026-07-01 ", libre="").model_dump() == {"obligatoria": "2026-07-01", "libre": ""}
    errores = {e["loc"][0]: e["msg"] for e in _errores_de(Modelo, obligatoria="", libre="x")}
    assert errores == {"obligatoria": "Value error, fecha requerida", "libre": "Value error, " + MSG_FECHA}
    with pytest.raises(ValidationError):
        Modelo(obligatoria="2026-13-45")


def _errores_de(modelo, **datos):
    from pydantic import ValidationError

    with pytest.raises(ValidationError) as e:
        modelo(**datos)
    return e.value.errors()
