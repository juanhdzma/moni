from fastapi import APIRouter

from ..calculos.listados import alertas
from ..calculos.constantes import TEXTO_DESACTUALIZADO
from ..calculos.fechas import ahora_bogota_iso, hoy_bogota
from ..core import estado as store
from ..core.db import conexion

router = APIRouter()


@router.get("/api/bootstrap")
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
