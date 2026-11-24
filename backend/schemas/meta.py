from pydantic import BaseModel


class Opcion(BaseModel):
    value: str
    label: str


class OpcionConAyuda(Opcion):
    hint: str


class PeriodosMeta(BaseModel):
    gastos: list[Opcion]
    evolucion: list[Opcion]


class ColumnaTx(BaseModel):
    col: str
    label: str
    dir_defecto: int


class DefaultsMeta(BaseModel):
    frecuencia_recurrente: str
    tipo_inversion: str
    pago_inversion: str


class PushMeta(BaseModel):
    hora: str
    texto: str


class MetaOut(BaseModel):
    frecuencias: list[Opcion]
    franquicias: list[Opcion]
    tipos_manuales: list[Opcion]
    tipos_categoria: list[Opcion]
    tipos_inversion: list[Opcion]
    pagos_inversion: list[Opcion]
    clases_deuda: list[Opcion]
    tipos_retiro: list[Opcion]
    destinos_rendimiento: list[OpcionConAyuda]
    monedas: list[Opcion]
    series_evolucion: list[Opcion]
    columnas_transaccion: list[ColumnaTx]
    periodos: PeriodosMeta
    defaults: DefaultsMeta
    push: PushMeta
