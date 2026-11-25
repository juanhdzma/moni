from typing import Annotated

from pydantic import BaseModel, Field

FILAS_MAX_POR_COLECCION = 100_000

Filas = Annotated[list[dict], Field(max_length=FILAS_MAX_POR_COLECCION)]


class ImportPayload(BaseModel):
    transacciones: Filas = []
    deudas: Filas = []
    inversiones: Filas = []
    activos: Filas = []
    recurrentes: Filas = []
    categorias: Filas = []
    ops_ocultas: Filas = []
    ajustes: Filas = []
