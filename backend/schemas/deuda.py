from typing import Optional

from pydantic import BaseModel, Field

from .validadores import Monto, MontoCero, clave_opcional, fecha_opcional, fecha_requerida


class DeudaIn(BaseModel):
    nombre: str = Field(min_length=1)
    monto_inicial: MontoCero
    saldo_actual: MontoCero
    tasa_ea: MontoCero = 0
    cuota_mensual: MontoCero = 0
    fecha_inicio: str = ""
    proxima_cuota: str = ""
    es_tarjeta: bool = False
    cupo: MontoCero = 0
    franquicia: str = ""
    crear_tx: bool = False

    _v_fecha = fecha_opcional("fecha_inicio", "proxima_cuota")


class DeudaAdelanto(BaseModel):
    monto: Monto
    nuevo_saldo: MontoCero
    fecha: str
    descripcion: str
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_requerida("fecha")


class DeudaPago(BaseModel):
    nuevo_saldo: MontoCero
    total_pagado: Monto
    intereses: MontoCero = 0
    fecha: str
    descripcion: str
    notas: str = ""
    registrar_tx: bool = True
    avanzar_cuota: bool = False
    op_clave: Optional[str] = None

    _v_fecha = fecha_requerida("fecha")
    _v_clave = clave_opcional("op_clave")
