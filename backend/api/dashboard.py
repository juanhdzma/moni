from typing import Annotated, Literal

from fastapi import APIRouter, Query

from ..calculos import dinero, listados, operaciones
from ..calculos.fechas import hoy_bogota
from ..core import estado as store
from ..core.db import conexion
from ..schemas.validadores import PeriodoEvolucion, PeriodoGastos

router = APIRouter()


def _simbolo(conn) -> str:
    return store.ajustes(conn)["moneda_simbolo"]


def _estado_de_hoy(conn):
    hoy = hoy_bogota()
    return store.cargar_estado(conn, hoy), hoy


@router.get("/api/all")
def get_all():
    with conexion() as conn:
        estado, hoy = _estado_de_hoy(conn)
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
        estado, hoy = _estado_de_hoy(conn)
        resumen = dinero.resumen_dashboard(estado, hoy)
        partes = dinero.partes_patrimonio(resumen, store.conteos(estado), _simbolo(conn))
        return {**resumen, "partes": partes}


@router.get("/api/dashboard/evolucion")
def dashboard_evolucion(
    serie: Literal["patrimonio", "inversiones"] = "patrimonio",
    periodo: PeriodoEvolucion = "6M",
):
    with conexion() as conn:
        estado, hoy = _estado_de_hoy(conn)
        return dinero.evolucion(estado, serie, periodo, hoy, _simbolo(conn))


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


@router.get("/api/dashboard/periodos")
def dashboard_periodos():
    return {
        "gastos": dinero.opciones_periodo(dinero.PERIODOS_GASTOS),
        "evolucion": dinero.opciones_periodo(dinero.PERIODOS_EVOLUCION_VISIBLES),
    }


@router.get("/api/dashboard/movimientos")
def dashboard_movimientos(n: Annotated[int, Query(ge=1, le=50)] = 5):
    with conexion() as conn:
        transacciones = store.coleccion(conn, "transacciones")
        return {"items": dinero.movimientos_recientes(transacciones, n)}


@router.get("/api/calc/tasa")
def calc_tasa(valor: float, tipo: Literal["ea", "mv"] = "ea"):
    if valor <= 0:
        return {"ea": None, "mv": None}
    ea = operaciones.convertir_tasa(valor, tipo)
    return {"ea": ea, "mv": valor if tipo == "mv" else operaciones.ea_a_mv(ea)}
