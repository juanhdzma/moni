from pydantic import BaseModel

from .comun import Segmento, TextoVacio


class ActivoCrudo(BaseModel):
    id: int
    nombre: str
    valor_inicial: float
    valor_actual: float
    fecha_adquisicion: str


class Activo(ActivoCrudo):
    cambio: float
    cambio_tono: str
    cambio_signo: str
    cambio_pct: float
    desactualizado: bool


class ResumenActivos(BaseModel):
    total_actual: float
    variacion: float
    variacion_tono: str
    variacion_signo: str
    mostrar_variacion: bool
    segmentos: list[Segmento]
    items: list[Activo]
    texto_variacion: str
    texto_conteo: str
    texto_vacio: TextoVacio


class PreviewVenta(BaseModel):
    vs_inicial: float
    vs_inicial_tono: str
    vs_inicial_signo: str
    vs_actual: float
    vs_actual_tono: str
    vs_actual_signo: str
