from pydantic import BaseModel, Field

from .validadores import Monto, MontoCero, fecha_opcional, fecha_requerida


class ActivoIn(BaseModel):
    nombre: str = Field(min_length=1)
    valor_inicial: MontoCero
    valor_actual: MontoCero
    fecha_adquisicion: str = ""
    valor_actualizado_en: str = ""
    crear_tx: bool = False

    _v_fecha = fecha_opcional("fecha_adquisicion", "valor_actualizado_en")


class ActivoVenta(BaseModel):
    precio: Monto
    fecha: str
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_requerida("fecha")
