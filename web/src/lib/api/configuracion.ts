import type { Ajustes, Categorias, OpsOcultas, TipoTx } from '@/types'
import { apiFetch, get, query, type AlAfectar } from './client'

export const agregarCategoria = (tipo: TipoTx, nombre: string, onAfectadas?: AlAfectar) =>
  apiFetch<Categorias>('/api/categorias', { method: 'POST', body: { tipo, nombre }, onAfectadas })
export const quitarCategoria = (tipo: TipoTx, nombre: string, onAfectadas?: AlAfectar) =>
  apiFetch<Categorias>(`/api/categorias${query({ tipo, nombre })}`, { method: 'DELETE', onAfectadas })

export const guardarAjustes = (ajustes: Ajustes, onAfectadas?: AlAfectar) =>
  apiFetch<Ajustes>('/api/ajustes', { method: 'PUT', body: ajustes, onAfectadas })

export const cargarOpsOcultas = () => get<OpsOcultas>('/api/ops-ocultas')
export const restaurarOp = (clave?: string, onAfectadas?: AlAfectar) =>
  apiFetch<null>(`/api/ops-ocultas${query({ clave })}`, { method: 'DELETE', onAfectadas })
