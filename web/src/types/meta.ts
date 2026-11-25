import type { Refinar, Schemas } from './gen'
import type { Opcion } from './comun'
import type { ColTx } from './transaccion'
import type { PeriodoEvolucion, PeriodoGastos } from './dashboard'

type ColumnaBase = Refinar<Schemas['ColumnaTx'], { dir_defecto: 1 | -1 }>
export type ColumnaOrdenable = Refinar<ColumnaBase, { col: ColTx; ordenable: true }>
export type ColumnaTransaccion = ColumnaOrdenable | Refinar<ColumnaBase, { ordenable: false }>

export type Meta = Refinar<Schemas['MetaOut'], { columnas_transaccion: ColumnaTransaccion[]; periodos: { gastos: Opcion<PeriodoGastos>[]; evolucion: Opcion<PeriodoEvolucion>[] } }>
