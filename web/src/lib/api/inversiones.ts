import type { RendimientoDefaults, TipoInversionOpcion } from '../../types/inversion'
import { get } from './client'

export const cargarTiposInversion = () => get<TipoInversionOpcion[]>('/api/inv/tipos')
export const cargarRendimientoDefaults = (id: number) => get<RendimientoDefaults>(`/api/inv/${id}/rendimiento/defaults`)
