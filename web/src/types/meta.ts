import type { Opcion, OpcionConAyuda, OpcionConTono, PagoInv, TipoInv, TipoRec, TipoTx } from './comun'
import type { PeriodoEvolucion, PeriodoGastos } from './dashboard'

export interface ColumnaTransaccion {
  col: string
  label: string
  dir_defecto: 1 | -1
}

export interface Meta {
  frecuencias: Opcion[]
  franquicias: Opcion[]
  tipos_manuales: Opcion<TipoRec>[]
  tipos_categoria: Opcion<TipoTx>[]
  tipos_inversion: OpcionConTono[]
  pagos_inversion: OpcionConTono[]
  tipos_tasa: Opcion<'ea' | 'mv'>[]
  clases_deuda: Opcion[]
  tipos_retiro: OpcionConTono[]
  destinos_rendimiento: OpcionConAyuda[]
  monedas: Opcion[]
  series_evolucion: Opcion[]
  columnas_transaccion: ColumnaTransaccion[]
  defaults: {
    frecuencia_recurrente: string
    tipo_inversion: TipoInv
    pago_inversion: PagoInv
    tipo_tasa: 'ea' | 'mv'
    clase_deuda: string
    franquicia: string
  }
  categoria_largo_max: number
  push: { hora: string; frase: string }
  periodos: { gastos: Opcion<PeriodoGastos>[]; evolucion: Opcion<PeriodoEvolucion>[] }
}
