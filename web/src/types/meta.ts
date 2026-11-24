import type { Opcion, OpcionConAyuda, PagoInv, TipoInv, TipoTx } from './comun'
import type { PeriodoEvolucion, PeriodoGastos } from './dashboard'

export interface ColumnaTransaccion {
  col: string
  label: string
  dir_defecto: 1 | -1
}

export interface Meta {
  frecuencias: Opcion[]
  franquicias: Opcion[]
  tipos_manuales: Opcion<'ingreso' | 'gasto'>[]
  tipos_categoria: Opcion<TipoTx>[]
  tipos_inversion: Opcion[]
  pagos_inversion: Opcion[]
  clases_deuda: Opcion[]
  tipos_retiro: Opcion[]
  destinos_rendimiento: OpcionConAyuda[]
  monedas: Opcion[]
  series_evolucion: Opcion[]
  columnas_transaccion: ColumnaTransaccion[]
  defaults: { frecuencia_recurrente: string; tipo_inversion: TipoInv; pago_inversion: PagoInv }
  push: { hora: string; texto: string }
  periodos: { gastos: Opcion<PeriodoGastos>[]; evolucion: Opcion<PeriodoEvolucion>[] }
}
