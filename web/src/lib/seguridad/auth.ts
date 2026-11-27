import { apiFetch } from '@/lib/api'
import type { Schemas } from '@/types/gen'

export type EstadoAuth = Schemas['EstadoAuth']
export type Sesion = Schemas['Sesion']
export type Passkey = Schemas['PasskeyFila']

export const cargarEstadoAuth = () => apiFetch<EstadoAuth>('/api/auth/estado')
export const entrarConClave = (clave: string) => apiFetch<{ ok: boolean }>('/api/auth/login', { method: 'POST', body: { clave } })
export const cerrarSesion = () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
export const cargarSesiones = () => apiFetch<Sesion[]>('/api/auth/sesiones')
export const revocarSesion = (id: number) => apiFetch<null>(`/api/auth/sesiones/${id}`, { method: 'DELETE' })
export const cargarPasskeys = () => apiFetch<Passkey[]>('/api/auth/passkeys')
export const borrarPasskey = (id: number) => apiFetch<null>(`/api/auth/passkeys/${id}`, { method: 'DELETE' })
