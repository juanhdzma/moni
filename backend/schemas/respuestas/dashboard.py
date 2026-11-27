from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

from ..validadores import PeriodoEvolucion, PeriodoGastos, SerieEvolucion, TipoTx
from .comun import Frase, TextoVacio


class ParteResumen(BaseModel):
    id: Literal["activos", "inversiones", "balance", "deudas"]
    nombre: str
    valor: float
    valor_firmado: float
    valor_signo: str
    proporcion: float
    negativo: bool
    detalle: str
    tono: str


class ResumenDashboard(BaseModel):
    patrimonio: float
    patrimonio_tono: str
    patrimonio_signo: str
    proy_delta: float
    proy_delta_tono: str
    proy_delta_signo: str
    texto_proyeccion: str
    total_barra: float
    partes: list[ParteResumen]


class PuntoEvolucion(BaseModel):
    mes: str
    valor: float


class Evolucion(BaseModel):
    serie: SerieEvolucion
    periodo: PeriodoEvolucion
    meses: int
    puntos: list[PuntoEvolucion]
    desde: float
    cambio: float
    nombre_serie: str
    tono: str
    descripcion_grafico: str
    frase: Frase


class FraseSinIngresos(Frase):
    tipo: Literal["sin_ingresos"]


class FraseQuedo(Frase):
    tipo: Literal["quedo"]
    pct: float


class FraseExcedio(Frase):
    tipo: Literal["excedio"]
    pct: float


FraseMes = Annotated[Union[FraseSinIngresos, FraseQuedo, FraseExcedio], Field(discriminator="tipo")]


class MesEntroSalio(BaseModel):
    mes: str
    entro: float
    salio: float


class EsteMes(BaseModel):
    ingresos: float
    gastos: float
    gastos_firmado: float
    quedo: float
    tono_ingresos: str
    tono_gastos: str
    tono_quedo: str
    signo_ingresos: str
    signo_gastos: str
    signo_quedo: str
    titulo: str
    etiqueta_ingresos: str
    etiqueta_gastos: str
    titulo_quedo: str
    texto_tarjeta: str
    frase: FraseMes
    descripcion_grafico: str
    meses: list[MesEntroSalio]


class DetalleGasto(BaseModel):
    id: int
    fecha: str
    descripcion: str
    categoria: str
    monto: float


class CategoriaGasto(BaseModel):
    categoria: str
    valor: float
    n: int
    detalle: list[DetalleGasto]
    restantes_texto: str | None
    pct: float


class TopGasto(BaseModel):
    categoria: str
    valor: float
    pct: float


class GastosPeriodo(BaseModel):
    periodo: PeriodoGastos
    total: float
    max: float
    top: TopGasto | None
    texto_vacio: str
    texto_total: str
    frase: Frase | None
    categorias: list[CategoriaGasto]


class Movimiento(BaseModel):
    id: int
    fecha: str
    tipo: TipoTx
    categoria: str
    descripcion: str
    monto: float
    monto_firmado: float
    monto_signo: str
    editable: bool
    tono: str
    icono_metodo: str
    icono_url: str


class Movimientos(BaseModel):
    items: list[Movimiento]
    texto_vacio: TextoVacio


class EquivalenciaTasa(BaseModel):
    ea: float | None
    mv: float | None
    texto: str | None

