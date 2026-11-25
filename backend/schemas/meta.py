from pydantic import BaseModel


class Opcion(BaseModel):
    value: str
    label: str


class OpcionConTono(Opcion):
    tono: str | None = None


class OpcionTipoInversion(OpcionConTono):
    campos: list[str]


class OpcionPagoInversion(OpcionConTono):
    requiere_dia: bool


class OpcionClaseDeuda(Opcion):
    es_tarjeta: bool


class OpcionModoPago(Opcion):
    placeholder_notas: str


class OpcionConAyuda(OpcionConTono):
    hint: str


class PeriodosMeta(BaseModel):
    gastos: list[Opcion]
    evolucion: list[Opcion]


class ColumnaTx(BaseModel):
    col: str
    label: str
    dir_defecto: int
    ordenable: bool
    oculta_en_movil: bool


class OrdenTx(BaseModel):
    col: str
    dir: int


class DefaultsMeta(BaseModel):
    frecuencia_recurrente: str
    tipo_inversion: str
    pago_inversion: str
    tipo_tasa: str
    clase_deuda: str
    franquicia: str
    tipo_retiro: str
    periodo_gastos: str
    periodo_evolucion: str
    serie_evolucion: str
    orden_tx: OrdenTx
    etiqueta_efectivo: str


class LimitesMeta(BaseModel):
    nombre: int
    descripcion: int
    notas: int
    dia_pago_max: int


class TruncateMeta(BaseModel):
    palabra: str
    texto: str
    entidades: list[str]


class PushMeta(BaseModel):
    hora: str
    frase: str


class MetaOut(BaseModel):
    frecuencias: list[Opcion]
    franquicias: list[Opcion]
    tipos_manuales: list[Opcion]
    tipos_categoria: list[Opcion]
    tipos_inversion: list[OpcionTipoInversion]
    tipos_tasa: list[Opcion]
    pagos_inversion: list[OpcionPagoInversion]
    clases_deuda: list[OpcionClaseDeuda]
    modos_pago: list[OpcionModoPago]
    tipos_retiro: list[OpcionConTono]
    destinos_rendimiento: list[OpcionConAyuda]
    monedas: list[Opcion]
    series_evolucion: list[OpcionConTono]
    columnas_transaccion: list[ColumnaTx]
    periodos: PeriodosMeta
    defaults: DefaultsMeta
    push: PushMeta
    categoria_largo_max: int
    limites: LimitesMeta
    truncate: TruncateMeta
