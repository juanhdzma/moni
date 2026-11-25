from fastapi import APIRouter

from ..calculos.operaciones.listados import alertas
from ..calculos.catalogo.constantes import TEXTO_DESACTUALIZADO
from ..calculos.base.fechas import ahora_bogota_iso, hoy_bogota
from ..core import estado as store
from ..core.db import conexion
from ..schemas.respuestas.sistema import Bootstrap

router = APIRouter()


@router.get("/api/bootstrap", response_model=Bootstrap)
def bootstrap():
    with conexion() as conn:
        hoy = hoy_bogota()
        return {
            "hoy": hoy.isoformat(),
            "ahora": ahora_bogota_iso(),
            "categorias": store.categorias(conn),
            "ajustes": store.ajustes(conn),
            "alertas": alertas(store.filas(conn, "activos"), store.filas(conn, "inversiones"), hoy),
            "desactualizado": {"texto": TEXTO_DESACTUALIZADO},
        }
