from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from ..calculos.fechas import ahora_bogota_iso
from .validadores import Monto, TipoTx, clave_opcional, validar_fecha


class TxIn(BaseModel):
    fecha: Optional[str] = Field(default=None, validate_default=True)
    tipo: TipoTx
    categoria: str = Field(min_length=1)
    descripcion: str = ""
    monto: Monto
    notas: str = ""
    tarjeta_id: Optional[int] = None
    op_clave: Optional[str] = None

    @field_validator("fecha")
    @classmethod
    def _v_fecha(cls, v):
        return ahora_bogota_iso() if v is None else validar_fecha(v, requerida=True)

    _v_clave = clave_opcional("op_clave")

    @model_validator(mode="after")
    def tarjeta_solo_en_gastos(self):
        if self.tipo != "gasto":
            self.tarjeta_id = None
        return self
