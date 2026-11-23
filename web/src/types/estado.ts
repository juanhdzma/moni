import type { ActivoIn } from './activo'
import type { Categorias } from './comun'
import type { DeudaIn } from './deuda'
import type { InvIn } from './inversion'
import type { RecIn } from './recurrente'
import type { TxIn } from './transaccion'

export interface Ajustes {
  moneda_simbolo: string
}

export interface Alertas {
  activos: boolean
  inversiones: boolean
}

export interface UmbralDesactualizado {
  dias: number
  texto: string
}

export interface Estado {
  hoy: string
  ahora: string
  categorias: Categorias
  ajustes: Ajustes
  alertas: Alertas
  desactualizado: UmbralDesactualizado
}

export type CrudEntity = 'tx' | 'deuda' | 'inv' | 'activo' | 'rec'

export interface CrudPayloads {
  tx: TxIn
  deuda: DeudaIn
  inv: InvIn
  activo: ActivoIn
  rec: RecIn
}

export interface PreviewValor {
  delta: number
  total: number
  total_pct: number
}
