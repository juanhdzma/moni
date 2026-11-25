from fastapi import Request, Response

from .ruta import ruta_de

HEADER_AFECTADAS = "X-Moni-Afectadas"

TRANSACCIONES = "transacciones"
DEUDAS = "deudas"
INVERSIONES = "inversiones"
ACTIVOS = "activos"
RECURRENTES = "recurrentes"
CATEGORIAS = "categorias"
AJUSTES = "ajustes"
OPS_OCULTAS = "opsOcultas"

TODAS = (TRANSACCIONES, DEUDAS, INVERSIONES, ACTIVOS, RECURRENTES, CATEGORIAS, AJUSTES, OPS_OCULTAS)
DEL_BOOTSTRAP = (ACTIVOS, INVERSIONES, AJUSTES, CATEGORIAS)

PREFIJOS_SIN_DATOS = ("/api/auth", "/api/push")
METODOS_QUE_MUTAN = {"POST", "PUT", "DELETE"}


def afectar(response: Response, *entidades: str) -> None:
    response.headers[HEADER_AFECTADAS] = ",".join(dict.fromkeys(entidades))


def con_movimiento(propia: str, escribio_tx: bool) -> tuple[str, ...]:
    return (propia, TRANSACCIONES) if escribio_tx else (propia,)


def con_op_oculta(entidades: tuple[str, ...], op_clave: str | None) -> tuple[str, ...]:
    return (*entidades, OPS_OCULTAS) if op_clave else entidades


def _muta_datos(request: Request) -> bool:
    path = ruta_de(request)
    return (
        request.method in METODOS_QUE_MUTAN
        and path.startswith("/api/")
        and not path.startswith(PREFIJOS_SIN_DATOS)
        and not path.endswith("/preview")
    )


async def afectadas_por_defecto(request: Request, call_next):
    response = await call_next(request)
    if _muta_datos(request) and response.status_code < 400 and HEADER_AFECTADAS not in response.headers:
        response.headers[HEADER_AFECTADAS] = ",".join(TODAS)
    return response
