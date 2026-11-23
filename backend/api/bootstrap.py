from fastapi import APIRouter

from ..calculos import listados
from ..calculos.constantes import DIAS_DESACTUALIZADO, TEXTO_DESACTUALIZADO
from ..calculos.fechas import ahora_bogota, hoy_bogota
from ..core import estado as store
from ..core.db import conexion

router = APIRouter()


@router.get("/api/bootstrap")
def bootstrap():
    with conexion() as conn:
        hoy = hoy_bogota()
        return {
            "hoy": hoy.isoformat(),
            "ahora": ahora_bogota(),
            "categorias": store.categorias(conn),
            "ajustes": store.ajustes(conn),
            "alertas": listados.alertas(store.filas(conn, "activos"), store.filas(conn, "inversiones"), hoy),
            "desactualizado": {"dias": DIAS_DESACTUALIZADO, "texto": TEXTO_DESACTUALIZADO},
        }
