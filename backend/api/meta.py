from typing import get_args

from fastapi import APIRouter

from ..calculos import dinero
from ..calculos.listados import ETIQUETAS_TIPO_FILA
from ..calculos.operaciones.frecuencias import opciones_frecuencia
from ..schemas.deuda import Franquicia
from ..schemas.meta import MetaOut

router = APIRouter()

TIPOS_INVERSION = [{"value": "fija", "label": "Fija"}, {"value": "variable", "label": "Variable"}]
PAGOS_INVERSION = [{"value": "mensual", "label": "Mensual"}, {"value": "vencimiento", "label": "Al vencimiento"}]


@router.get("/api/meta", response_model=MetaOut)
def meta():
    return {
        "frecuencias": opciones_frecuencia(),
        "franquicias": [{"value": f, "label": f or "Ninguna"} for f in get_args(Franquicia)],
        "tipos_transaccion": [{"value": k, "label": v} for k, v in ETIQUETAS_TIPO_FILA.items()],
        "tipos_inversion": TIPOS_INVERSION,
        "pagos_inversion": PAGOS_INVERSION,
        "periodos": {
            "gastos": dinero.opciones_periodo(dinero.PERIODOS_GASTOS),
            "evolucion": dinero.opciones_periodo(dinero.PERIODOS_EVOLUCION_VISIBLES),
        },
    }
