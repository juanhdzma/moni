from typing import Annotated, Literal

from fastapi import APIRouter, Query

from ..calculos import dinero, listados, operaciones
from ..calculos.fechas import hoy_bogota
from ..core import estado as store
from ..core.db import conexion

router = APIRouter()


@router.get("/api/all")
def get_all():
    with conexion() as conn:
        hoy = hoy_bogota()
        estado = store.cargar_estado(conn, hoy)
        return {
            **estado,
            "hoy": hoy.isoformat(),
            "mes_actual": hoy.isoformat()[:7],
            "ajustes": store.ajustes(conn),
            "categorias": store.categorias(conn),
            "alertas": listados.alertas(estado["activos"], estado["inversiones"], hoy),
            "conteos": store.conteos(estado),
        }


@router.get("/api/dashboard/resumen")
def dashboard_resumen():
    with conexion() as conn:
        hoy = hoy_bogota()
        estado = store.cargar_estado(conn, hoy)
        resumen = dinero.resumen_dashboard(estado, hoy)
        return {**resumen, "partes": dinero.partes_patrimonio(resumen, store.conteos(estado))}


@router.get("/api/dashboard/evolucion")
def dashboard_evolucion(
    serie: Literal["patrimonio", "inversiones"] = "patrimonio",
    periodo: Literal["1M", "3M", "6M", "1Y", "ALL"] = "6M",
):
    with conexion() as conn:
        hoy = hoy_bogota()
        return dinero.evolucion(store.cargar_estado(conn, hoy), serie, periodo, hoy)


@router.get("/api/dashboard/este-mes")
def dashboard_este_mes():
    with conexion() as conn:
        hoy = hoy_bogota()
        return dinero.este_mes(store.cargar_estado(conn, hoy), hoy)


@router.get("/api/dashboard/gastos")
def dashboard_gastos(periodo: Literal["1W", "1M", "3M", "6M", "1Y", "ALL"] = "1M"):
    with conexion() as conn:
        hoy = hoy_bogota()
        return dinero.gastos_periodo(store.cargar_estado(conn, hoy)["transacciones"], periodo, hoy)


@router.get("/api/dashboard/movimientos")
def dashboard_movimientos(n: Annotated[int, Query(ge=1, le=50)] = 5):
    with conexion() as conn:
        transacciones = store.coleccion(conn, "transacciones")
        return {"items": dinero.movimientos_recientes(transacciones, n)}


@router.get("/api/calc/tasa")
def calc_tasa(valor: float, tipo: Literal["ea", "mv"] = "ea"):
    if valor <= 0:
        return {"ea": None, "mv": None}
    if tipo == "ea":
        return {"ea": valor, "mv": operaciones.ea_a_mv(valor)}
    return {"ea": operaciones.mv_a_ea(valor), "mv": valor}
