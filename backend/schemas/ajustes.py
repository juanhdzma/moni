from typing import Annotated, Optional

from pydantic import BaseModel, Field, field_validator

from ..calculos import listados
from .validadores import TipoTx, clave_opcional


class CategoriaIn(BaseModel):
    tipo: TipoTx
    nombre: str


class AjustesIn(BaseModel):
    moneda_simbolo: str

    @field_validator("moneda_simbolo")
    @classmethod
    def _simbolo(cls, v: str) -> str:
        return listados.validar_simbolo(v)


class MigracionLocal(BaseModel):
    categorias: dict[str, list[Annotated[str, Field(max_length=60)]]] = Field(default={}, max_length=10)
    ops_ocultas: list[Annotated[str, Field(max_length=100)]] = Field(default=[], max_length=500)
    moneda_simbolo: Optional[str] = None


class OpOculta(BaseModel):
    clave: str

    _v_clave = clave_opcional("clave")
