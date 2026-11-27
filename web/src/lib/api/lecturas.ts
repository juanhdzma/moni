import type {
  Activo, Deuda, Estado, FiltrosTx, Inversion, ListadoTx, Meta, OpcionesTx, Recurrente, ResumenActivos, ResumenDeudas,
  ResumenInversiones, ResumenRecurrentes, Transaccion,
} from '@/types'
import { get, query } from './client'

export const cargarMeta = () => get<Meta>('/api/meta')

export const cargarBootstrap = () => get<Estado>('/api/bootstrap')

export const cargarResumenDeudas = () => get<ResumenDeudas>('/api/deudas/resumen')
export const cargarResumenInversiones = () => get<ResumenInversiones>('/api/inv/resumen')
export const cargarResumenActivos = () => get<ResumenActivos>('/api/activos/resumen')
export const cargarResumenRecurrentes = () => get<ResumenRecurrentes>('/api/rec/resumen')

export const cargarOpcionesTx = (txId?: number) => get<OpcionesTx>(`/api/tx/opciones${query({ tx_id: txId })}`)
export const cargarListadoTx = (f: FiltrosTx = {}) => get<ListadoTx>(`/api/tx${query({ ...f })}`)

export const cargarTx = (id: number) => get<Transaccion>(`/api/tx/${id}`)
export const cargarDeuda = (id: number) => get<Deuda>(`/api/deuda/${id}`)
export const cargarInversion = (id: number) => get<Inversion>(`/api/inv/${id}`)
export const cargarRecurrente = (id: number) => get<Recurrente>(`/api/rec/${id}`)
export const cargarActivo = (id: number) => get<Activo>(`/api/activo/${id}`)
