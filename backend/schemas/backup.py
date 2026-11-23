from pydantic import BaseModel


class ImportPayload(BaseModel):
    transacciones: list[dict] = []
    deudas: list[dict] = []
    inversiones: list[dict] = []
    activos: list[dict] = []
    recurrentes: list[dict] = []
    categorias: list[dict] = []
    ops_ocultas: list[dict] = []
