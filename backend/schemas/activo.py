from pydantic import BaseModel

from .validadores import MontoPesos, MontoCero, Nombre, fecha_opcional


class ActivoIn(BaseModel):
    nombre: Nombre
    valor_inicial: MontoPesos
    valor_actual: MontoCero = 0
    fecha_adquisicion: str = ""
    valor_actualizado_en: str = ""
    crear_tx: bool = False

    _v_fecha = fecha_opcional("fecha_adquisicion", "valor_actualizado_en")


class ActivoVenta(BaseModel):
    precio: MontoPesos
    fecha: str = ""
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_opcional("fecha")


class ActivoValor(BaseModel):
    nuevo_valor: MontoPesos
    fecha: str = ""

    _v_fecha = fecha_opcional("fecha")
