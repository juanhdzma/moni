from typing import Annotated

from fastapi import APIRouter, Query

from ..calculos.operaciones.tasas import equivalencia_tasa
from ..schemas.respuestas.dashboard import EquivalenciaTasa
from ..schemas.validadores import TasaTipo

router = APIRouter()


@router.get("/api/calc/tasa", response_model=EquivalenciaTasa)
def calc_tasa(valor: Annotated[float, Query(ge=-1000, le=1000, allow_inf_nan=False)], tipo: TasaTipo = "ea"):
    return equivalencia_tasa(valor, tipo)
