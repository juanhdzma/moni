from typing import Annotated, Literal, Optional

from pydantic import Field, field_validator, model_validator

from ..calculos.catalogo.constantes import DIA_PAGO_MAX, PAGOS_INVERSION, TIPOS_INVERSION, TIPOS_RETIRO, valores
from .validadores import (
    ConOpClave, Entrada, MontoCero, MontoPesos, Nombre, Notas, Tasa, TasaTipo, fecha_opcional,
)


TipoInversion = Literal[valores(TIPOS_INVERSION)]
PagoInversion = Literal[valores(PAGOS_INVERSION)]
TipoRetiro = Literal[valores(TIPOS_RETIRO)]


class InvIn(Entrada):
    nombre: Nombre
    tipo: TipoInversion
    monto_invertido: MontoPesos
    valor_actual: Optional[MontoPesos] = None
    tasa_ea: Optional[Tasa] = None
    tasa_tipo: TasaTipo = "ea"
    fecha_inicio: str = ""
    pago: Optional[PagoInversion] = None
    dia_pago: Optional[Annotated[int, Field(ge=1, le=DIA_PAGO_MAX)]] = None
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


class InvRendimiento(ConOpClave):
    monto: MontoPesos
    fecha: str = ""
    notas: Notas = ""
    registrar_tx: bool = True
    capitaliza: bool = False

    _v_fecha = fecha_opcional("fecha")


class InvAporte(Entrada):
    monto: MontoPesos
    nuevo_valor: Optional[MontoCero] = None
    fecha: str = ""
    notas: Notas = ""
    registrar_tx: bool = True

    _v_fecha = fecha_opcional("fecha")


class InvRetiro(Entrada):
    tipo: TipoRetiro
    monto: MontoPesos
    saldo_queda: Optional[MontoCero] = None
    fecha: str = ""
    notas: Notas = ""
    registrar_tx: bool = True

    _v_fecha = fecha_opcional("fecha")


class InvValor(Entrada):
    nuevo_valor: MontoPesos
    fecha: str = ""

    _v_fecha = fecha_opcional("fecha")
