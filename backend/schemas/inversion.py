from typing import Annotated, Literal, Optional

from pydantic import BaseModel, Field

from .validadores import Monto, MontoCero, clave_opcional, fecha_opcional, fecha_requerida


class InvIn(BaseModel):
    nombre: str = Field(min_length=1)
    tipo: Literal["fija", "variable"]
    monto_invertido: MontoCero
    valor_actual: MontoCero
    tasa_ea: Optional[MontoCero] = None
    tasa_tipo: Literal["ea", "mv"] = "ea"
    fecha_inicio: str = ""
    pago: Optional[Literal["mensual", "vencimiento"]] = None
    dia_pago: Optional[Annotated[int, Field(ge=1, le=31)]] = None
    valor_actualizado_en: str = ""
    crear_tx: bool = False

    _v_fecha = fecha_opcional("fecha_inicio", "valor_actualizado_en")


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
    nuevo_valor: MontoCero
    fecha: str
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_requerida("fecha")


class InvRetiro(BaseModel):
    tipo: Literal["total", "parcial"]
    monto: Monto
    saldo_queda: Optional[MontoCero] = None
    fecha: str
    notas: str = ""
    registrar_tx: bool = True

    _v_fecha = fecha_requerida("fecha")
