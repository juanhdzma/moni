import { apiFetch } from '../api'

export interface EstadoAuth {
  configurado: boolean
  autenticado: boolean
  passkeys: number
}

export interface Sesion {
  id: number
  creada: string
  ultimo_uso: string
  ip: string
  user_agent: string
  metodo: string
  actual: boolean
}

export interface Passkey {
  id: number
  nombre: string
  creada: string
  ultimo_uso: string | null
}

export const cargarEstadoAuth = () => apiFetch<EstadoAuth>('/api/auth/estado')
export const entrarConClave = (clave: string) => apiFetch<{ ok: boolean }>('/api/auth/login', { method: 'POST', body: { clave } })
export const cerrarSesion = () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
export const cargarSesiones = () => apiFetch<Sesion[]>('/api/auth/sesiones')
export const revocarSesion = (id: number) => apiFetch<null>(`/api/auth/sesiones/${id}`, { method: 'DELETE' })
export const cargarPasskeys = () => apiFetch<Passkey[]>('/api/auth/passkeys')
export const borrarPasskey = (id: number) => apiFetch<null>(`/api/auth/passkeys/${id}`, { method: 'DELETE' })
