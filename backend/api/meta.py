from fastapi import APIRouter

from ..calculos import dinero
from ..calculos.catalogo.constantes import (
    CATEGORIA_LARGO_MAX,
    CLASES_DEUDA,
    DEFAULTS_FORMULARIOS,
    DESTINOS_RENDIMIENTO,
    ETIQUETAS_TIPO_CATEGORIA,
    FRANQUICIAS,
    LIMITES,
    MODOS_PAGO,
    MONEDAS,
    PAGOS_INVERSION,
    SERIES_EVOLUCION,
    TIPOS_INVERSION,
    TIPOS_RETIRO,
    TIPOS_TASA,
    TIPOS_TX,
    frase_aviso_diario,
)
from ..calculos.operaciones.listados import EFECTIVO_DEBITO, columnas_transaccion
from ..calculos.operaciones.frecuencias import opciones_frecuencia
from ..push.job_diario import HORA_AVISO
from ..core.afectadas import DEL_BOOTSTRAP, TODAS
from ..core.backup import aviso_truncate
from ..schemas.meta import MetaOut

router = APIRouter()


@router.get("/api/meta", response_model=MetaOut)
def meta():
    return {
        "frecuencias": opciones_frecuencia(),
        "franquicias": FRANQUICIAS,
        "tipos_manuales": [o for o in TIPOS_TX if o["value"] != "transfer"],
        "tipos_categoria": ETIQUETAS_TIPO_CATEGORIA,
        "tipos_inversion": TIPOS_INVERSION,
        "tipos_tasa": TIPOS_TASA,
        "pagos_inversion": PAGOS_INVERSION,
        "clases_deuda": CLASES_DEUDA,
        "modos_pago": MODOS_PAGO,
        "tipos_retiro": TIPOS_RETIRO,
        "destinos_rendimiento": DESTINOS_RENDIMIENTO,
        "monedas": MONEDAS,
        "series_evolucion": SERIES_EVOLUCION,
        "columnas_transaccion": columnas_transaccion(),
        "periodos": {
            "gastos": dinero.opciones_periodo(dinero.PERIODOS_GASTOS),
            "evolucion": dinero.opciones_periodo(dinero.PERIODOS_EVOLUCION_VISIBLES),
        },
        "defaults": {**DEFAULTS_FORMULARIOS, "etiqueta_efectivo": EFECTIVO_DEBITO},
        "push": {"hora": f"{HORA_AVISO}:00", "frase": frase_aviso_diario(f"{HORA_AVISO}:00")},
        "categoria_largo_max": CATEGORIA_LARGO_MAX,
        "limites": LIMITES,
        "truncate": aviso_truncate(),
        "entidades": TODAS,
        "entidades_del_bootstrap": DEL_BOOTSTRAP,
    }
