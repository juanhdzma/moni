from typing import Literal, Optional

from pydantic import BaseModel, computed_field, model_validator

from ..calculos.constantes import CLASES_DEUDA, valores
from .validadores import MontoPesos, MontoCero, Nombre, Tasa, clave_opcional, fecha_opcional

Franquicia = Literal["Visa", "Mastercard", "Amex", "Otra", ""]
ClaseDeuda = Literal[valores(CLASES_DEUDA)]


class DeudaIn(BaseModel):
    nombre: Nombre
    monto_inicial: MontoCero = 0
    saldo_actual: MontoCero = 0
    tasa_ea: Tasa = 0
    cuota_mensual: MontoCero = 0
    fecha_inicio: str = ""
    proxima_cuota: str = ""
    clase_deuda: ClaseDeuda = "prestamo"
    cupo: MontoCero = 0
    franquicia: Franquicia = ""

    _v_fecha = fecha_opcional("fecha_inicio", "proxima_cuota")

    @model_validator(mode="before")
    @classmethod
    def rechazar_es_tarjeta(cls, datos):
        if isinstance(datos, dict) and "es_tarjeta" in datos:
            raise ValueError("es_tarjeta fue reemplazado por clase_deuda")
        return datos

    @computed_field
    @property
    def es_tarjeta(self) -> bool:
        return self.clase_deuda == "tarjeta"

    @model_validator(mode="after")
    def normalizar_segun_tipo(self):
        if self.clase_deuda == "tarjeta":
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
        if self.clase_deuda == "tarjeta":
            self.crear_tx = False
        return self

    @model_validator(mode="after")
    def exigir_saldo_en_creditos(self):
        if self.clase_deuda != "tarjeta" and not self.saldo_actual:
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
    monto: MontoPesos
    fecha: str = ""
    descripcion: str = ""
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_opcional("fecha")


class AdelantoPreview(_SaldoTrasAdelanto):
    monto: MontoCero


ModoPago = Literal["cuota", "abono", "liquidar"]


class DeudaPago(BaseModel):
    modo: ModoPago
    nuevo_saldo: MontoCero
    total_pagado: MontoPesos
    intereses: Optional[MontoCero] = None
    fecha: str = ""
    descripcion: str = ""
    notas: str = ""
    registrar_tx: bool = True
    op_clave: Optional[str] = None

    _v_fecha = fecha_opcional("fecha")
    _v_clave = clave_opcional("op_clave")
