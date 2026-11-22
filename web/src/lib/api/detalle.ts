import type { Activo, Deuda, Inversion, Recurrente, Transaccion } from '../../types'
import { get } from './client'

export const cargarTx = (id: number) => get<Transaccion>(`/api/tx/${id}`)
export const cargarDeuda = (id: number) => get<Deuda>(`/api/deuda/${id}`)
export const cargarInversion = (id: number) => get<Inversion>(`/api/inv/${id}`)
export const cargarActivo = (id: number) => get<Activo>(`/api/activo/${id}`)
export const cargarRecurrente = (id: number) => get<Recurrente>(`/api/rec/${id}`)
