from pydantic import BaseModel

from ..meta import Opcion
from ..validadores import TipoTx
from .comun import Frase, Segmento, TextoVacio


class TxCruda(BaseModel):
    id: int
    fecha: str
    tipo: TipoTx
    categoria: str
    descripcion: str
    monto: float
    notas: str
    tarjeta_id: int | None


class Tx(TxCruda):
    monto_firmado: float
    tarjeta_nombre: str | None
    tarjeta_franquicia: str | None
    metodo_pago: str
    editable: bool
    tono: str
    icono_metodo: str


class FilaTx(Tx):
    tipo_label: str
    grupo: str | None


class FiltrosTx(BaseModel):
    tipo: str
    mes: str
    cat: str


class OpcionesListadoTx(BaseModel):
    meses: list[Opcion]
    categorias: list[str]
    tipos: list[Opcion]


class PillTx(BaseModel):
    campo: str
    label: str


class ResumenTx(BaseModel):
    ingresos: float
    gastos: float
    gastos_firmado: float
    neto: float
    dato: Frase
    segmentos: list[Segmento]
    titulo: str


class ListadoTx(BaseModel):
    items: list[FilaTx]
    filtros: FiltrosTx
    opciones: OpcionesListadoTx
    pills: list[PillTx]
    resumen: ResumenTx
    texto_vacio: TextoVacio


class TarjetaOpcion(BaseModel):
    id: int
    nombre: str


class CategoriasPorTipo(BaseModel):
    ingreso: list[str]
    gasto: list[str]


class CategoriaPorDefecto(BaseModel):
    ingreso: str
    gasto: str


class InicialTx(BaseModel):
    tipo: str
    categoria: str
    tarjeta_id: int | None
    fecha: str


class OpcionesTx(BaseModel):
    tarjetas: list[TarjetaOpcion]
    categorias: CategoriasPorTipo
    categoria_default: CategoriaPorDefecto
    inicial: InicialTx
