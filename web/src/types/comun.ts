import type { Refinar, Schemas } from './gen'
import type { ActivoIn, ColTx, DeudaIn, InvIn, RecIn, TxIn } from './entidades'

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

export type Entidad = Schemas['MetaOut']['entidades'][number]

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

export type TonoFrase = Schemas['ParteFrase']['tono']
export type Frase = Schemas['Frase']

export type ParteResumen = Schemas['ParteResumen']
export type ResumenDashboard = Schemas['ResumenDashboard']
export type EsteMes = Schemas['EsteMes']
export type GastosPeriodo = Schemas['GastosPeriodo']
export type Movimientos = Schemas['Movimientos']
export type Evolucion = Schemas['Evolucion']

export type SerieEvolucion = Evolucion['serie']
export type PeriodoEvolucion = Evolucion['periodo']
export type PeriodoGastos = GastosPeriodo['periodo']

export type OperacionProxima = Schemas['OperacionProxima']
export type ProximasOperaciones = Schemas['ProximasOperaciones']
export type OpsOcultas = Schemas['OpsOcultas']

type ColumnaBase = Refinar<Schemas['ColumnaTx'], { dir_defecto: 1 | -1 }>
export type ColumnaOrdenable = Refinar<ColumnaBase, { col: ColTx; ordenable: true }>
export type ColumnaTransaccion = ColumnaOrdenable | Refinar<ColumnaBase, { ordenable: false }>

export type Meta = Refinar<Schemas['MetaOut'], { columnas_transaccion: ColumnaTransaccion[]; periodos: { gastos: Opcion<PeriodoGastos>[]; evolucion: Opcion<PeriodoEvolucion>[] } }>
