from typing import Annotated, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from ..calculos.constantes import PAGOS_INVERSION, TIPOS_INVERSION, TIPOS_RETIRO, valores
from .validadores import Monto, MontoCero, Nombre, TasaTipo, clave_opcional, fecha_opcional, fecha_requerida


TipoInversion = Literal[valores(TIPOS_INVERSION)]
PagoInversion = Literal[valores(PAGOS_INVERSION)]
TipoRetiro = Literal[valores(TIPOS_RETIRO)]


class InvIn(BaseModel):
    nombre: Nombre
    tipo: TipoInversion
    monto_invertido: Monto
    valor_actual: Optional[Monto] = None
    tasa_ea: Optional[MontoCero] = None
    tasa_tipo: TasaTipo = "ea"
    fecha_inicio: str = ""
    pago: Optional[PagoInversion] = None
    dia_pago: Optional[Annotated[int, Field(ge=1, le=31)]] = None
    valor_actualizado_en: str = ""
    crear_tx: bool = False

    _v_fecha = fecha_opcional("fecha_inicio", "valor_actualizado_en")

    @field_validator("valor_actual", "tasa_ea", "pago", "dia_pago", mode="before")
    @classmethod
    def _vacio_es_nulo(cls, v):
        return None if v == "" else v

    @model_validator(mode="after")
    def normalizar_segun_tipo(self):
        self.tasa_ea = self.tasa_ea or None
        if self.tipo != "fija":
            self.tasa_ea = self.pago = None
        if self.pago != "mensual":
            self.dia_pago = None
        return self


class InvRendimiento(BaseModel):
    monto: Monto
    fecha: str
    notas: str = ""
    registrar_tx: bool = True
    capitaliza: bool = False
    op_clave: Optional[str] = None

    _v_fecha = fecha_requerida("fecha")
    _v_clave = clave_opcional("op_clave")


class InvAporte(BaseModel):
    monto: Monto
    nuevo_valor: Optional[MontoCero] = None
    fecha: str
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_requerida("fecha")


class InvRetiro(BaseModel):
    tipo: TipoRetiro
    monto: Monto
    saldo_queda: Optional[MontoCero] = None
    fecha: str
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_requerida("fecha")


class InvValor(BaseModel):
    nuevo_valor: Monto
    fecha: str = ""

    _v_fecha = fecha_opcional("fecha")
