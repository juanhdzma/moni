from typing import Optional

from pydantic import BaseModel

from .deuda import ModoPago
from .validadores import MontoCero


class PagoPreview(BaseModel):
    modo: ModoPago
    total_pagado: MontoCero
    nuevo_saldo: Optional[MontoCero] = None


class NuevoValor(BaseModel):
    nuevo_valor: MontoCero


class MontoPreview(BaseModel):
    monto: MontoCero


class PrecioPreview(BaseModel):
    precio: MontoCero
