export interface ApiFetchOptions {
  method?: string
  body?: unknown
}

function mensajeDeError(j: unknown, status: number): string {
  const msg = `Error ${status}`
  if (typeof j !== 'object' || j === null || !('detail' in j)) return msg
  const detail = j.detail
  if (Array.isArray(detail)) {
    return (detail as unknown[])
      .map((d) => (typeof d === 'object' && d !== null && 'msg' in d ? String(d.msg) : ''))
      .join(', ')
  }
  return typeof detail === 'string' && detail ? detail : msg
}

export class ApiError extends Error {
  readonly status: number
  readonly reintentarEnS: number | null

  constructor(message: string, status: number, reintentarEnS: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.reintentarEnS = reintentarEnS
  }
}

export interface AuthEvents {
  noAutenticado: () => void
  bloqueada: (reintentarEnS: number) => void
}

let authEvents: AuthEvents | null = null

export function setAuthEvents(events: AuthEvents | null): void {
  authEvents = events
}

const RUTAS_DE_LOGIN = ['/api/auth/login', '/api/auth/passkey/login/', '/api/auth/estado']

const esRutaDeLogin = (path: string): boolean => RUTAS_DE_LOGIN.some((r) => path.startsWith(r))

function segundosDeBloqueo(j: unknown): number | null {
  if (typeof j !== 'object' || j === null || !('reintentar_en_s' in j)) return null
  const n = Number(j.reintentar_en_s)
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : null
}

export async function apiFetch<T = unknown>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET'
  const headers: Record<string, string> = {}
  if (method !== 'GET') headers['X-Moni-Request'] = '1'
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(path, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) {
    let msg: string
    let bloqueo: number | null = null
    try {
      const j: unknown = await res.json()
      msg = mensajeDeError(j, res.status)
      bloqueo = res.status === 403 ? segundosDeBloqueo(j) : null
    } catch {
      msg = `Error ${res.status}`
    }
    if (bloqueo !== null) authEvents?.bloqueada(bloqueo)
    else if (res.status === 401 && !esRutaDeLogin(path)) authEvents?.noAutenticado()
    throw new ApiError(msg, res.status, bloqueo)
  }
  if (res.status === 204) return null as T
  return (await res.json()) as T
}

export function query(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const get = <T>(path: string) => apiFetch<T>(path)
export const post = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body })
