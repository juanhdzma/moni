from typing import Annotated, Literal, Optional

from pydantic import BaseModel, StringConstraints, model_validator

from .validadores import Monto, MontoCero, clave_opcional, fecha_opcional

Franquicia = Literal["Visa", "Mastercard", "Amex", "Otra", ""]
Nombre = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class DeudaIn(BaseModel):
    nombre: Nombre
    monto_inicial: MontoCero = 0
    saldo_actual: MontoCero = 0
    tasa_ea: MontoCero = 0
    cuota_mensual: MontoCero = 0
    fecha_inicio: str = ""
    proxima_cuota: str = ""
    es_tarjeta: bool = False
    cupo: MontoCero = 0
    franquicia: Franquicia = ""

    _v_fecha = fecha_opcional("fecha_inicio", "proxima_cuota")

    @model_validator(mode="after")
    def normalizar_segun_tipo(self):
        if self.es_tarjeta:
            self.monto_inicial = self.tasa_ea = self.cuota_mensual = 0
            self.fecha_inicio = self.proxima_cuota = ""
        else:
            self.cupo = 0
            self.franquicia = ""
        return self


class DeudaCrear(DeudaIn):
    crear_tx: bool = False

    @model_validator(mode="after")
    def tarjeta_no_registra_credito(self):
        if self.es_tarjeta:
            self.crear_tx = False
        return self

    @model_validator(mode="after")
    def exigir_saldo_en_creditos(self):
        if not self.es_tarjeta and not self.saldo_actual:
            raise ValueError("Saldo requerido")
        return self


class _SaldoTrasAdelanto(BaseModel):
    nuevo_saldo: Optional[MontoCero] = None
    disponible_nuevo: Optional[MontoCero] = None

    @model_validator(mode="after")
    def pide_saldo_o_disponible(self):
        if self.nuevo_saldo is None and self.disponible_nuevo is None:
            raise ValueError("nuevo_saldo o disponible_nuevo requerido")
        return self


class DeudaAdelanto(_SaldoTrasAdelanto):
    monto: Monto
    fecha: str = ""
    descripcion: str = ""
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_opcional("fecha")


class AdelantoPreview(_SaldoTrasAdelanto):
    monto: MontoCero


class DeudaPago(BaseModel):
    nuevo_saldo: MontoCero
    total_pagado: Monto
    intereses: Optional[MontoCero] = None
    fecha: str = ""
    descripcion: str = ""
    notas: str = ""
    registrar_tx: bool = True
    avanzar_cuota: bool = False
    op_clave: Optional[str] = None

    _v_fecha = fecha_opcional("fecha")
    _v_clave = clave_opcional("op_clave")
