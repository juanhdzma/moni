from typing import get_args

from fastapi import APIRouter

from ..calculos import dinero
from ..calculos.constantes import (
    CLASES_DEUDA,
    DESTINOS_RENDIMIENTO,
    ETIQUETAS_TIPO_CATEGORIA,
    MONEDAS,
    PAGOS_INVERSION,
    SERIES_EVOLUCION,
    TIPOS_INVERSION,
    TIPOS_RETIRO,
)
from ..calculos.listados import COLUMNAS_ORDEN, DIRECCION_INICIAL, ETIQUETAS_COLUMNA, ETIQUETAS_TIPO_FILA
from ..calculos.operaciones.frecuencias import opciones_frecuencia
from ..schemas.deuda import Franquicia
from ..schemas.meta import MetaOut

router = APIRouter()


def _opciones(etiquetas: dict) -> list[dict]:
    return [{"value": k, "label": v} for k, v in etiquetas.items()]


@router.get("/api/meta", response_model=MetaOut)
def meta():
    return {
        "frecuencias": opciones_frecuencia(),
        "franquicias": [{"value": f, "label": f or "Ninguna"} for f in get_args(Franquicia)],
        "tipos_manuales": _opciones({k: v for k, v in ETIQUETAS_TIPO_FILA.items() if k != "transfer"}),
        "tipos_categoria": ETIQUETAS_TIPO_CATEGORIA,
        "tipos_inversion": TIPOS_INVERSION,
        "pagos_inversion": PAGOS_INVERSION,
        "clases_deuda": CLASES_DEUDA,
        "tipos_retiro": TIPOS_RETIRO,
        "destinos_rendimiento": DESTINOS_RENDIMIENTO,
        "monedas": MONEDAS,
        "series_evolucion": SERIES_EVOLUCION,
        "columnas_transaccion": [
            {"col": c, "label": ETIQUETAS_COLUMNA[c], "dir_defecto": DIRECCION_INICIAL[c]} for c in COLUMNAS_ORDEN
        ],
        "periodos": {
            "gastos": dinero.opciones_periodo(dinero.PERIODOS_GASTOS),
            "evolucion": dinero.opciones_periodo(dinero.PERIODOS_EVOLUCION_VISIBLES),
        },
    }
