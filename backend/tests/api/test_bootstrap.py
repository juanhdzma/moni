import datetime

from backend.calculos.constantes import DIAS_DESACTUALIZADO, TEXTO_DESACTUALIZADO

from .builders_api import HOY, sembrar


def test_bootstrap_lleva_solo_el_contexto_de_la_sesion(client):
    sembrar(client)
    body = client.get("/api/bootstrap").json()
    assert set(body) == {"hoy", "ahora", "categorias", "ajustes", "alertas", "desactualizado"}
    assert body["hoy"] == HOY.isoformat()
    assert body["ahora"].startswith(body["hoy"]) and len(body["ahora"]) == 16
    assert body["ajustes"] == {"moneda_simbolo": "$"}
    assert body["alertas"] == {"activos": False, "inversiones": True}
    assert body["desactualizado"] == {"texto": TEXTO_DESACTUALIZADO}
    assert body["categorias"]["ingreso"][0] == {"nombre": "Crédito recibido", "sistema": True}


def test_bootstrap_alerta_de_activo_desactualizado(client):
    viejo = (HOY - datetime.timedelta(days=DIAS_DESACTUALIZADO + 1)).isoformat()
    client.post("/api/activo", json={"nombre": "Casa", "valor_inicial": 10, "valor_actualizado_en": viejo})
    assert client.get("/api/bootstrap").json()["alertas"]["activos"] is True
