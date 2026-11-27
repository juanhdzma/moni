from typing import Literal

from pydantic import BaseModel

Nivel = Literal["alto", "medio", "bajo"]


class Ok(BaseModel):
    ok: bool


class ParteFrase(BaseModel):
    texto: str
    tono: str | None


class Frase(BaseModel):
    texto: str
    partes: list[ParteFrase]


class Segmento(BaseModel):
    key: str
    label: str
    valor: float
    opacidad: float


class TextoVacio(BaseModel):
    titulo: str
    texto: str


class ProximoPago(BaseModel):
    fecha: str
    texto: str


class CategoriaItem(BaseModel):
    nombre: str
    sistema: bool


class Categorias(BaseModel):
    ingreso: list[CategoriaItem]
    gasto: list[CategoriaItem]
    transfer: list[CategoriaItem]


class PreviewValor(BaseModel):
    delta: float
    delta_tono: str
    delta_signo: str
    total: float
    total_tono: str
    total_signo: str
    total_pct: float

