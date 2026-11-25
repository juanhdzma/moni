from pydantic import BaseModel

from .comun import Categorias


class Ajustes(BaseModel):
    moneda_simbolo: str


class Alertas(BaseModel):
    activos: bool
    inversiones: bool


class Desactualizado(BaseModel):
    texto: str


class Bootstrap(BaseModel):
    hoy: str
    ahora: str
    categorias: Categorias
    ajustes: Ajustes
    alertas: Alertas
    desactualizado: Desactualizado


class DeudaBackup(BaseModel):
    id: int
    nombre: str
    monto_inicial: float
    saldo_actual: float
    tasa_ea: float
    cuota_mensual: float
    fecha_inicio: str
    proxima_cuota: str
    es_tarjeta: int
    cupo: float
    franquicia: str
    total_intereses: float


class InversionBackup(BaseModel):
    id: int
    nombre: str
    tipo: str
    monto_invertido: float
    valor_actual: float
    tasa_ea: float | None
    fecha_inicio: str
    pago: str | None
    dia_pago: int | None
    valor_actualizado_en: str


class ActivoBackup(BaseModel):
    id: int
    nombre: str
    valor_inicial: float
    valor_actual: float
    fecha_adquisicion: str
    valor_actualizado_en: str


class RecurrenteBackup(BaseModel):
    id: int
    nombre: str
    tipo: str
    monto: float
    frecuencia: str
    activo: int
    fecha_inicio: str
    notas: str


class TransaccionBackup(BaseModel):
    id: int
    fecha: str
    tipo: str
    categoria: str
    descripcion: str
    monto: float
    notas: str
    tarjeta_id: int | None


class CategoriaBackup(BaseModel):
    tipo: str
    nombre: str


class OpOcultaBackup(BaseModel):
    clave: str
    tipo: str
    fuente_id: int
    fecha: str
    creada_en: str


class AjusteBackup(BaseModel):
    clave: str
    valor: str


class Backup(BaseModel):
    deudas: list[DeudaBackup]
    inversiones: list[InversionBackup]
    activos: list[ActivoBackup]
    recurrentes: list[RecurrenteBackup]
    transacciones: list[TransaccionBackup]
    categorias: list[CategoriaBackup]
    ops_ocultas: list[OpOcultaBackup]
    ajustes: list[AjusteBackup]


class ConteosImport(BaseModel):
    deudas: int
    inversiones: int
    activos: int
    recurrentes: int
    transacciones: int
    categorias: int
    ops_ocultas: int
    ajustes: int


class ResultadoImport(BaseModel):
    counts: ConteosImport
    texto: str
