from ..calculos.constantes import CATEGORIAS_SISTEMA

TX_COLS = ["fecha", "tipo", "categoria", "descripcion", "monto", "notas", "tarjeta_id"]
DEUDA_COLS = ["nombre", "monto_inicial", "saldo_actual", "tasa_ea", "cuota_mensual", "fecha_inicio", "proxima_cuota", "es_tarjeta", "cupo", "franquicia"]
INV_COLS = ["nombre", "tipo", "monto_invertido", "valor_actual", "tasa_ea", "fecha_inicio", "pago", "dia_pago", "valor_actualizado_en"]
ACTIVO_COLS = ["nombre", "valor_inicial", "valor_actual", "fecha_adquisicion", "valor_actualizado_en"]
REC_COLS = ["nombre", "tipo", "monto", "frecuencia", "activo", "fecha_inicio", "notas"]

CAT_INGRESO = CATEGORIAS_SISTEMA["ingreso"]
