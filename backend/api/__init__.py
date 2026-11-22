from fastapi import APIRouter

from . import activos, ajustes, backup, bootstrap, dashboard, deudas, inversiones, ops_ocultas, recurrentes, transacciones

router = APIRouter()
for modulo in (bootstrap, dashboard, transacciones, deudas, inversiones, activos, recurrentes, ops_ocultas, ajustes, backup):
    router.include_router(modulo.router)
