from .defaults import completar_activo, completar_deuda, completar_inversion, completar_recurrente
from .derivados import derivar_activo, derivar_deuda, derivar_inversion, derivar_recurrente
from .finanzas import cambio_valor, comision_adelanto, desglose_pago
from .proximas import armar_proximas, calcular_proximas_operaciones, claves_vigentes
from .resumenes import (
    con_categoria_sugerida,
    preview_venta_activo,
    resumen_activos,
    resumen_deudas,
    resumen_inversiones,
    resumen_recurrentes,
)
from .tasas import normalizar_tasa
