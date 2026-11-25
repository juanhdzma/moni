import asyncio
import json

import pytest

from backend.seguridad import limite_body
from backend.seguridad.limite_body import LIMITE_BYTES, LIMITE_IMPORT_BYTES, LimiteBody

DETALLE = {"detail": "El cuerpo de la petición es demasiado grande"}


class Canal:
    def __init__(self, trozos=(), declarado=None):
        self.trozos = list(trozos)
        self.enviados = []
        self.lecturas = 0
        self.headers = [] if declarado is None else [(b"content-length", str(declarado).encode())]

    async def receive(self):
        self.lecturas += 1
        if not self.trozos:
            return {"type": "http.request", "body": b"", "more_body": False}
        cuerpo = self.trozos.pop(0)
        return {"type": "http.request", "body": cuerpo, "more_body": bool(self.trozos)}

    async def send(self, mensaje):
        self.enviados.append(mensaje)

    def correr(self, app, path="/api/x"):
        scope = {"type": "http", "path": path, "headers": self.headers}
        asyncio.run(LimiteBody(app)(scope, self.receive, self.send))
        return self

    @property
    def estados(self):
        return [m["status"] for m in self.enviados if m["type"] == "http.response.start"]


async def app_que_lee_todo_y_responde(scope, receive, send):
    while (await receive()).get("more_body"):
        pass
    await send({"type": "http.response.start", "status": 200, "headers": []})
    await send({"type": "http.response.body", "body": b"ok"})


def test_rechazo_413_tiene_cabeceras_y_cuerpo_exactos():
    canal = Canal(declarado=LIMITE_BYTES + 1).correr(app_que_lee_todo_y_responde)
    cuerpo = json.dumps(DETALLE).encode()
    assert canal.enviados == [
        {
            "type": "http.response.start",
            "status": 413,
            "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(cuerpo)).encode())],
        },
        {"type": "http.response.body", "body": cuerpo},
    ]


def test_content_length_declarado_se_rechaza_sin_leer_el_cuerpo():
    canal = Canal(declarado=LIMITE_BYTES + 1).correr(app_que_lee_todo_y_responde)
    assert canal.estados == [413] and canal.lecturas == 0


def test_content_length_exactamente_en_el_limite_pasa():
    canal = Canal([b"x" * LIMITE_BYTES], declarado=LIMITE_BYTES).correr(app_que_lee_todo_y_responde)
    assert canal.estados == [200]


def test_cuerpo_en_trozos_de_exactamente_el_limite_pasa_y_un_byte_mas_no():
    assert Canal([b"x" * 400_000, b"x" * 600_000]).correr(app_que_lee_todo_y_responde).estados == [200]
    assert Canal([b"x" * 400_000, b"x" * 600_001]).correr(app_que_lee_todo_y_responde).estados == [413]


def test_import_tiene_limite_propio_y_content_length_no_numerico_se_ignora():
    assert Canal(declarado=LIMITE_BYTES + 1).correr(app_que_lee_todo_y_responde, "/api/import").estados == [200]
    assert Canal(declarado=LIMITE_IMPORT_BYTES + 1).correr(app_que_lee_todo_y_responde, "/API//import").estados == [413]
    canal = Canal()
    canal.headers = [(b"content-length", b"abc")]
    assert canal.correr(app_que_lee_todo_y_responde).estados == [200]


async def app_que_responde_y_luego_lee(scope, receive, send):
    await send({"type": "http.response.start", "status": 200, "headers": []})
    await receive()
    await receive()


def test_si_la_app_ya_respondio_no_se_manda_un_413_encima():
    canal = Canal([b"x" * 900_000, b"x" * 900_000]).correr(app_que_responde_y_luego_lee)
    assert canal.estados == [200]


async def app_que_lee_sin_capturar(scope, receive, send):
    while True:
        await receive()


def test_si_la_app_no_captura_el_exceso_el_middleware_responde_413_una_vez():
    canal = Canal([b"x" * 900_000, b"x" * 900_000]).correr(app_que_lee_sin_capturar)
    assert canal.estados == [413]
    assert [m["type"] for m in canal.enviados] == ["http.response.start", "http.response.body"]


async def app_que_captura_y_responde_en_dos_mensajes(scope, receive, send):
    try:
        while True:
            await receive()
    except limite_body._Excedido:
        await send({"type": "http.response.start", "status": 500, "headers": []})
        await send({"type": "http.response.body", "body": b"error"})


def test_si_la_app_captura_el_exceso_solo_sale_un_413_aunque_mande_mas_mensajes():
    canal = Canal([b"x" * 900_000, b"x" * 900_000]).correr(app_que_captura_y_responde_en_dos_mensajes)
    assert canal.estados == [413]
    assert [m["type"] for m in canal.enviados] == ["http.response.start", "http.response.body"]


def test_los_scopes_que_no_son_http_pasan_directo():
    visto = []

    async def app(scope, receive, send):
        visto.append(scope["type"])

    asyncio.run(LimiteBody(app)({"type": "lifespan"}, None, None))
    assert visto == ["lifespan"]


def test_limites_por_defecto():
    assert (LIMITE_BYTES, LIMITE_IMPORT_BYTES, limite_body.RUTA_IMPORT) == (1_000_000, 10_000_000, "/api/import")
