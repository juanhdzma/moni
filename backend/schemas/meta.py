from pydantic import BaseModel


class Opcion(BaseModel):
    value: str
    label: str


class OpcionConTono(Opcion):
    tono: str | None = None


class OpcionConAyuda(OpcionConTono):
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
    tipo_tasa: str
    clase_deuda: str
    franquicia: str


class PushMeta(BaseModel):
    hora: str
    frase: str


class MetaOut(BaseModel):
    frecuencias: list[Opcion]
    franquicias: list[Opcion]
    tipos_manuales: list[Opcion]
    tipos_categoria: list[Opcion]
    tipos_inversion: list[OpcionConTono]
    tipos_tasa: list[Opcion]
    pagos_inversion: list[OpcionConTono]
    clases_deuda: list[Opcion]
    tipos_retiro: list[OpcionConTono]
    destinos_rendimiento: list[OpcionConAyuda]
    monedas: list[Opcion]
    series_evolucion: list[Opcion]
    columnas_transaccion: list[ColumnaTx]
    periodos: PeriodosMeta
    defaults: DefaultsMeta
    push: PushMeta
    categoria_largo_max: int
