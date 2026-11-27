from typing import Optional

from pydantic import Field, field_validator, model_validator

from ..calculos.catalogo.constantes import CATEGORIA_LARGO_MAX
from .validadores import Descripcion, Entrada, MontoPesos, Notas, TipoTx, clave_opcional, validar_fecha


class TxIn(Entrada):
    fecha: Optional[str] = None
    tipo: TipoTx
    categoria: str = Field(min_length=1, max_length=CATEGORIA_LARGO_MAX)
    descripcion: Descripcion = ""
    monto: MontoPesos
    notas: Notas = ""
    tarjeta_id: Optional[int] = None
    op_clave: Optional[str] = None

    @field_validator("fecha")
    @classmethod
    def _v_fecha(cls, v):
        return None if v is None else validar_fecha(v, requerida=True)

    _v_clave = clave_opcional("op_clave")

    @model_validator(mode="after")
    def tarjeta_solo_en_gastos(self):
        if self.tipo != "gasto":
            self.tarjeta_id = None
        return self
