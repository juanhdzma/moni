from pydantic import BaseModel


class Opcion(BaseModel):
    value: str
    label: str


class PeriodosMeta(BaseModel):
    gastos: list[Opcion]
    evolucion: list[Opcion]


class MetaOut(BaseModel):
    frecuencias: list[Opcion]
    franquicias: list[Opcion]
    tipos_transaccion: list[Opcion]
    tipos_inversion: list[Opcion]
    pagos_inversion: list[Opcion]
    periodos: PeriodosMeta
