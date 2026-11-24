from ..constantes import CATEGORIAS_SISTEMA
from .textos import descripcion_tx

_GASTO = CATEGORIAS_SISTEMA["gasto"]
_INGRESO = CATEGORIAS_SISTEMA["ingreso"]


def _tx(fecha: str, tipo: str, categoria: str, prefijo: str, nombre: str, monto: float, notas: str = "") -> dict:
    return {
        "fecha": fecha,
        "tipo": tipo,
        "categoria": categoria,
        "descripcion": descripcion_tx(prefijo, nombre),
        "monto": monto,
        "notas": notas,
    }


def tx_inversion_nueva(inv: dict) -> dict:
    return _tx(inv["fecha_inicio"], "gasto", _GASTO["inversion"], "inversion_nueva", inv["nombre"], inv["monto_invertido"])


def tx_aporte(nombre: str, monto: float, fecha: str, notas: str) -> dict:
    return _tx(fecha, "gasto", _GASTO["inversion"], "aporte", nombre, monto, notas)


def tx_rendimiento(nombre: str, monto: float, fecha: str, notas: str) -> dict:
    return _tx(fecha, "ingreso", _INGRESO["intereses"], "rendimiento", nombre, monto, notas)


def tx_retiro(prefijo: str, nombre: str, monto: float, fecha: str, notas: str) -> dict:
    return _tx(fecha, "ingreso", _INGRESO["dividendos"], prefijo, nombre, monto, notas)


def tx_compra_activo(activo: dict) -> dict:
    return _tx(activo["fecha_adquisicion"], "gasto", _GASTO["compra_activos"], "compra", activo["nombre"], activo["valor_inicial"])


def tx_venta_activo(nombre: str, precio: float, fecha: str, notas: str) -> dict:
    return _tx(fecha, "ingreso", _INGRESO["venta_activos"], "venta", nombre, precio, notas)
