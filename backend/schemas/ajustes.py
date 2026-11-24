from pydantic import BaseModel, field_validator

from ..calculos.categorias import validar_simbolo
from .validadores import TipoTx, clave_opcional


class CategoriaIn(BaseModel):
    tipo: TipoTx
    nombre: str


class AjustesIn(BaseModel):
    moneda_simbolo: str

    @field_validator("moneda_simbolo")
    @classmethod
    def _simbolo(cls, v: str) -> str:
        return validar_simbolo(v)


class OpOculta(BaseModel):
    clave: str

    _v_clave = clave_opcional("clave")


class OpOcultaBackup(OpOculta):
    creada_en: str = ""
