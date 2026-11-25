import type { Opcional, Refinar, Schemas } from './gen'
import type { operations } from './api.gen'

export type Transaccion = Schemas['Tx']
export type TxIn = Opcional<Schemas['TxIn'], 'fecha' | 'tarjeta_id' | 'op_clave'>

type QueryListado = NonNullable<operations['listar_tx_api_tx_get']['parameters']['query']>
export type ColTx = NonNullable<QueryListado['col']>
export type FiltrosTx = Refinar<QueryListado, { dir?: 1 | -1 }>

export type FilaTx = Schemas['FilaTx']
export type ListadoTx = Refinar<Schemas['ListadoTx'], { pills: { campo: 'mes' | 'tipo' | 'cat'; label: string }[] }>
export type OpcionesTx = Schemas['OpcionesTx']
