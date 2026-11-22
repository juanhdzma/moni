from typing import Optional

from pydantic import BaseModel, Field

from .validadores import Monto, TipoTx, clave_opcional, fecha_requerida


class TxIn(BaseModel):
    fecha: str
    tipo: TipoTx
    categoria: str = Field(min_length=1)
    descripcion: str = ""
    monto: Monto
    notas: str = ""
    tarjeta_id: Optional[int] = None
    op_clave: Optional[str] = None

    _v_fecha = fecha_requerida("fecha")
    _v_clave = clave_opcional("op_clave")
