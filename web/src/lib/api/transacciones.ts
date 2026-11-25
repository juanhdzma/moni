import type { FiltrosTx, ListadoTx, OpcionesTx } from '@/types/transaccion'
import { get, query } from './client'

export const cargarOpcionesTx = (txId?: number) => get<OpcionesTx>(`/api/tx/opciones${query({ tx_id: txId })}`)
export const cargarListadoTx = (f: FiltrosTx = {}) => get<ListadoTx>(`/api/tx${query({ ...f })}`)
