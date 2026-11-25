import json

from ..core.ruta import ruta_normalizada

LIMITE_BYTES = 1_000_000
LIMITE_IMPORT_BYTES = 10_000_000
RUTA_IMPORT = "/api/import"
RESPUESTA = json.dumps({"detail": "El cuerpo de la petición es demasiado grande"}).encode()


class _Excedido(Exception):
    pass


class LimiteBody:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        limite = LIMITE_IMPORT_BYTES if ruta_normalizada(scope["path"]) == RUTA_IMPORT else LIMITE_BYTES
        declarado = dict(scope["headers"]).get(b"content-length", b"0")
        if declarado.isdigit() and int(declarado) > limite:
            return await self._rechazar(send)
        recibidos = 0
        excedido = False
        respondido = False

        async def receive_limitado():
            nonlocal recibidos, excedido
            mensaje = await receive()
            recibidos += len(mensaje.get("body", b""))
            if recibidos > limite:
                excedido = True
                raise _Excedido
            return mensaje

        async def send_visto(mensaje):
            nonlocal respondido
            if not excedido:
                respondido = respondido or mensaje["type"] == "http.response.start"
                return await send(mensaje)
            if not respondido:
                respondido = True
                await self._rechazar(send)

        try:
            await self.app(scope, receive_limitado, send_visto)
        except _Excedido:
            if not respondido:
                await self._rechazar(send)

    @staticmethod
    async def _rechazar(send):
        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(RESPUESTA)).encode())],
            }
        )
        await send({"type": "http.response.body", "body": RESPUESTA})
