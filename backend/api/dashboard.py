from typing import Annotated, Literal

from fastapi import APIRouter, Query

from ..calculos import dinero, operaciones
from ..calculos.fechas import hoy_bogota
from ..calculos.formato import porcentaje_texto
from ..core import estado as store
from ..core.db import conexion
from ..schemas.validadores import PeriodoEvolucion, PeriodoGastos, SerieEvolucion

router = APIRouter()


def _estado_de_hoy(conn):
    hoy = hoy_bogota()
    return store.cargar_estado(conn, hoy), hoy


@router.get("/api/all")
def exportar_todo():
    with conexion() as conn:
        return store.cargar_estado(conn, hoy_bogota())


@router.get("/api/dashboard/resumen")
def dashboard_resumen():
    with conexion() as conn:
        estado, hoy = _estado_de_hoy(conn)
        resumen = dinero.resumen_dashboard(estado, hoy)
        partes = dinero.partes_patrimonio(resumen, store.conteos(conn), store.simbolo(conn))
        return {**resumen, "partes": partes}


@router.get("/api/dashboard/evolucion")
def dashboard_evolucion(
    serie: SerieEvolucion = "patrimonio",
    periodo: PeriodoEvolucion = "6M",
):
    with conexion() as conn:
        estado, hoy = _estado_de_hoy(conn)
        return dinero.evolucion(estado, serie, periodo, hoy, store.simbolo(conn))


@router.get("/api/dashboard/este-mes")
def dashboard_este_mes():
    with conexion() as conn:
        estado, hoy = _estado_de_hoy(conn)
        return dinero.este_mes(estado, hoy)


@router.get("/api/dashboard/gastos")
def dashboard_gastos(periodo: PeriodoGastos = "1M"):
    with conexion() as conn:
        estado, hoy = _estado_de_hoy(conn)
        return dinero.gastos_periodo(estado["transacciones"], periodo, hoy)


@router.get("/api/dashboard/movimientos")
def dashboard_movimientos(n: Annotated[int, Query(ge=1, le=50)] = 5):
    with conexion() as conn:
        transacciones = store.coleccion(conn, "transacciones")
        return {"items": dinero.movimientos_recientes(transacciones, n)}


@router.get("/api/calc/tasa")
def calc_tasa(valor: float, tipo: Literal["ea", "mv"] = "ea"):
    if valor <= 0:
        return {"ea": None, "mv": None, "texto": None}
    ea = operaciones.convertir_tasa(valor, tipo)
    mv = valor if tipo == "mv" else operaciones.ea_a_mv(ea)
    equivalente = f"{porcentaje_texto(mv, 4)}% MV" if tipo == "ea" else f"{porcentaje_texto(ea, 2)}% EA"
    return {"ea": ea, "mv": mv, "texto": f"Equivale a {equivalente}"}
