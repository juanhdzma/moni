from pydantic import BaseModel

from .deuda import ModoPago
from .validadores import MontoCero


class PagoPreview(BaseModel):
    modo: ModoPago
    total_pagado: MontoCero
    nuevo_saldo: MontoCero


class NuevoValor(BaseModel):
    nuevo_valor: MontoCero


class MontoPreview(BaseModel):
    monto: MontoCero


class PrecioPreview(BaseModel):
    precio: MontoCero
