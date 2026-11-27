from typing import Annotated

from fastapi import APIRouter, Query

from ..calculos import dinero
from ..calculos.base.fechas import hoy_bogota
from ..core import estado as store
from ..core.db import conexion
from ..schemas.respuestas.dashboard import (
    EsteMes, Evolucion, GastosPeriodo, Movimientos, ResumenDashboard,
)
from ..schemas.validadores import PeriodoEvolucion, PeriodoGastos, SerieEvolucion

router = APIRouter()

CAMPOS_RESUMEN = ("patrimonio", "patrimonio_tono", "patrimonio_signo", "proy_delta", "proy_delta_tono", "proy_delta_signo", "texto_proyeccion", "total_barra")


def _estado_de_hoy(conn, *nombres):
    hoy = hoy_bogota()
    return store.cargar_estado(conn, hoy, nombres), hoy


@router.get("/api/dashboard/resumen", response_model=ResumenDashboard)
def dashboard_resumen():
    with conexion() as conn:
        estado, hoy = _estado_de_hoy(conn, "transacciones", "deudas", "inversiones", "activos")
        resumen = dinero.resumen_dashboard(estado, hoy)
        conteos = {nombre: len(estado[nombre]) for nombre in ("activos", "inversiones")}
        partes = dinero.partes_patrimonio(resumen, conteos, store.simbolo(conn))
        return {**{k: resumen[k] for k in CAMPOS_RESUMEN}, "partes": partes}


@router.get("/api/dashboard/evolucion", response_model=Evolucion)
def dashboard_evolucion(
    serie: SerieEvolucion = "patrimonio",
    periodo: PeriodoEvolucion = "6M",
):
    with conexion() as conn:
        colecciones = ("transacciones", "inversiones") if serie == "inversiones" else ("transacciones", "deudas", "inversiones", "activos")
        estado, hoy = _estado_de_hoy(conn, *colecciones)
        return dinero.evolucion(estado, serie, periodo, hoy, store.simbolo(conn))


@router.get("/api/dashboard/este-mes", response_model=EsteMes)
def dashboard_este_mes():
    with conexion() as conn:
        estado, hoy = _estado_de_hoy(conn, "transacciones")
        return dinero.este_mes(estado, hoy)


@router.get("/api/dashboard/gastos", response_model=GastosPeriodo)
def dashboard_gastos(periodo: PeriodoGastos = "1M"):
    with conexion() as conn:
        estado, hoy = _estado_de_hoy(conn, "transacciones")
        return dinero.gastos_periodo(estado["transacciones"], periodo, hoy)


@router.get("/api/dashboard/movimientos", response_model=Movimientos)
def dashboard_movimientos(n: Annotated[int, Query(ge=1, le=50)] = 5):
    with conexion() as conn:
        transacciones = store.coleccion(conn, "transacciones", hoy_bogota())
        return dinero.movimientos_dashboard(transacciones, n)
