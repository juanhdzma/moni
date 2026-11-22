import type { Estado, ResumenActivos, ResumenDeudas, ResumenInversiones, ResumenRecurrentes } from '../../types'
import { get } from './client'

export const cargarBootstrap = () => get<Estado>('/api/bootstrap')

export const cargarResumenDeudas = () => get<ResumenDeudas>('/api/deudas/resumen')
export const cargarResumenInversiones = () => get<ResumenInversiones>('/api/inv/resumen')
export const cargarResumenActivos = () => get<ResumenActivos>('/api/activos/resumen')
export const cargarResumenRecurrentes = () => get<ResumenRecurrentes>('/api/rec/resumen')
