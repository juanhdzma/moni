import type { RendimientoDefaults } from '../../types/inversion'
import { get } from './client'

export const cargarRendimientoDefaults = (id: number) => get<RendimientoDefaults>(`/api/inv/${id}/rendimiento/defaults`)
