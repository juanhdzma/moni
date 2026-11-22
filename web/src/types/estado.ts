import type { Activo, ActivoIn, ApiActivo } from './activo'
import type { Categorias, TipoTx } from './comun'
import type { ApiDeuda, Deuda, DeudaIn } from './deuda'
import type { ApiInversion, InvIn, Inversion } from './inversion'
import type { ApiRecurrente, RecIn, Recurrente } from './recurrente'
import type { ApiTransaccion, Transaccion, TxIn } from './transaccion'

export interface Ajustes {
  moneda_simbolo: string
}

export interface Alertas {
  activos: boolean
  inversiones: boolean
}

export interface Conteos {
  activos: number
  inversiones: number
}

export interface ApiAll {
  transacciones: ApiTransaccion[]
  deudas: ApiDeuda[]
  inversiones: ApiInversion[]
  activos: ApiActivo[]
  recurrentes: ApiRecurrente[]
  hoy: string
  mes_actual: string
  ajustes: Ajustes
  categorias: Categorias
  alertas: Alertas
  conteos: Conteos
}

export interface Estado {
  transacciones: Transaccion[]
  deudas: Deuda[]
  inversiones: Inversion[]
  activos: Activo[]
  recurrentes: Recurrente[]
  hoy: string
  mes_actual: string
  ajustes: Ajustes
  categorias: Categorias
  alertas: Alertas
  conteos: Conteos
}

export type CrudEntity = 'tx' | 'deuda' | 'inv' | 'activo' | 'rec'

export interface CrudPayloads {
  tx: TxIn
  deuda: DeudaIn
  inv: InvIn
  activo: ActivoIn
  rec: RecIn
}

export interface MigrarLocalIn {
  categorias: Record<TipoTx, string[]>
  ops_ocultas: string[]
  moneda_simbolo: string | null
}

export interface MigrarLocalResult {
  categorias: number
  ops_ocultas: number
  moneda_simbolo: boolean
}

export interface PreviewValor {
  delta: number
  total: number
  total_pct: number
}
