from typing import Optional

from .validadores import Entrada, MontoCero, MontoPesos, Nombre, Notas, fecha_opcional


class ActivoIn(Entrada):
    nombre: Nombre
    valor_inicial: MontoPesos
    valor_actual: Optional[MontoCero] = None
    fecha_adquisicion: str = ""
    valor_actualizado_en: str = ""
    crear_tx: bool = False

    _v_fecha = fecha_opcional("fecha_adquisicion", "valor_actualizado_en")


class ActivoVenta(Entrada):
    precio: MontoPesos
    fecha: str = ""
    notas: Notas = ""
    registrar_tx: bool = True

    _v_fecha = fecha_opcional("fecha")


class ActivoValor(Entrada):
    nuevo_valor: MontoPesos
    fecha: str = ""

    _v_fecha = fecha_opcional("fecha")
