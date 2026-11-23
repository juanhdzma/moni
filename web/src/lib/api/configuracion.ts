import type { Ajustes, Categorias, OpsOcultas, TipoTx } from '../../types'
import { apiFetch, get, post, query } from './client'

export const agregarCategoria = (tipo: TipoTx, nombre: string) => post<Categorias>('/api/categorias', { tipo, nombre })
export const quitarCategoria = (tipo: TipoTx, nombre: string) =>
  apiFetch<Categorias>(`/api/categorias${query({ tipo, nombre })}`, { method: 'DELETE' })

export const guardarAjustes = (ajustes: Ajustes) => apiFetch<Ajustes>('/api/ajustes', { method: 'PUT', body: ajustes })

export const cargarOpsOcultas = () => get<OpsOcultas>('/api/ops-ocultas')
export const ocultarOp = (clave: string) => post<{ clave: string }>('/api/ops-ocultas', { clave })
export const restaurarOp = (clave?: string) =>
  apiFetch<null>(`/api/ops-ocultas${query({ clave })}`, { method: 'DELETE' })

