from typing import Literal

from pydantic import BaseModel

from .comun import Frase


class OperacionProxima(BaseModel):
    clave: str
    tipo: Literal["deuda", "inversion", "recurrente"]
    fuente_id: int
    fecha: str
    dia: int
    mes_corto: str
    etiqueta: str
    sub: str
    monto: float
    sin_monto: bool
    texto_dias: str
    vencida: bool


class ProximasOperaciones(BaseModel):
    items: list[OperacionProxima]
    extra: list[OperacionProxima]
    texto_ver_todas: str | None
    texto_ver_menos: str | None
    frase: Frase | None
    texto_vacio: str


class OpOculta(BaseModel):
    clave: str
    tipo: str
    fuente_id: int
    fecha: str
    etiqueta: str | None


class OpsOcultas(BaseModel):
    items: list[OpOculta]


class OpOcultaCreada(BaseModel):
    clave: str
