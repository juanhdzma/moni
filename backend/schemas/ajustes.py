from pydantic import BaseModel, ConfigDict, field_validator

from ..calculos.catalogo.categorias import validar_simbolo
from .validadores import Entrada, TipoTx, clave_opcional


class CategoriaIn(Entrada):
    tipo: TipoTx
    nombre: str


class AjustesIn(Entrada):
    moneda_simbolo: str

    @field_validator("moneda_simbolo")
    @classmethod
    def _simbolo(cls, v: str) -> str:
        return validar_simbolo(v)


class OpOculta(Entrada):
    clave: str

    _v_clave = clave_opcional("clave")


class OpOcultaBackup(OpOculta):
    model_config = ConfigDict(extra="ignore")
    creada_en: str = ""
