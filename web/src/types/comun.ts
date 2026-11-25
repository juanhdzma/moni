import type { Refinar, Schemas } from './gen'

export type TipoTx = Schemas['Tx']['tipo']
export type TipoRec = Schemas['Recurrente']['tipo']
export type TipoInv = Schemas['Inversion']['tipo']
export type PagoInv = NonNullable<Schemas['Inversion']['pago']>

export type Opcion<T extends string = string> = Refinar<Schemas['Opcion'], { value: T }>
export type OpcionConTono<T extends string = string> = Refinar<Schemas['OpcionConTono'], { value: T }>
export type OpcionConAyuda = Schemas['OpcionConAyuda']

export type TextoVacio = Schemas['TextoVacio']
export type Nivel = Schemas['Deuda']['nivel_progreso']
export type ProximoPago = Schemas['ProximoPago']
export type Segmento = Schemas['Segmento']
export type Tasa = Schemas['EquivalenciaTasa']
export type Categorias = Schemas['Categorias']

export type Entidad =
  | 'transacciones'
  | 'deudas'
  | 'inversiones'
  | 'activos'
  | 'recurrentes'
  | 'categorias'
  | 'ajustes'
  | 'opsOcultas'
