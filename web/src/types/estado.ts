import type { ActivoIn } from './activo'
import type { DeudaIn } from './deuda'
import type { InvIn } from './inversion'
import type { RecIn } from './recurrente'
import type { Schemas } from './gen'
import type { TxIn } from './transaccion'

export type Ajustes = Schemas['Ajustes']
export type Estado = Schemas['Bootstrap']

export type CrudEntity = 'tx' | 'deuda' | 'inv' | 'activo' | 'rec'

export interface CrudPayloads {
  tx: TxIn
  deuda: DeudaIn
  inv: InvIn
  activo: ActivoIn
  rec: RecIn
}
