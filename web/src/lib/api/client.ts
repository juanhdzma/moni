interface ApiFetchOptions {
  method?: string
  body?: unknown
  onAfectadas?: (header: string | null) => void
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

interface Bloqueo {
  reintentarEnS: number
  texto: string
}

export class ApiError extends Error {
  readonly status: number
  readonly reintentarEnS: number | null
  readonly textoBloqueo: string | null

  constructor(message: string, status: number, bloqueo: Bloqueo | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.reintentarEnS = bloqueo?.reintentarEnS ?? null
    this.textoBloqueo = bloqueo?.texto ?? null
  }
}

interface AuthEvents {
  noAutenticado: () => void
  bloqueada: (texto: string) => void
}

let authEvents: AuthEvents | null = null

export function setAuthEvents(events: AuthEvents | null): void {
  authEvents = events
}

const RUTAS_DE_LOGIN = ['/api/auth/login', '/api/auth/passkey/login/', '/api/auth/estado']

const esRutaDeLogin = (path: string): boolean => RUTAS_DE_LOGIN.some((r) => path.startsWith(r))

function datosDeBloqueo(j: unknown, mensaje: string): Bloqueo | null {
  if (typeof j !== 'object' || j === null || !('reintentar_en_s' in j)) return null
  const reintentarEnS = Number(j.reintentar_en_s)
  if (!Number.isFinite(reintentarEnS) || reintentarEnS <= 0) return null
  const texto = 'texto' in j && typeof j.texto === 'string' && j.texto ? j.texto : mensaje
  return { reintentarEnS: Math.ceil(reintentarEnS), texto }
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
    let bloqueo: Bloqueo | null = null
    try {
      const j: unknown = await res.json()
      msg = mensajeDeError(j, res.status)
      bloqueo = res.status === 403 ? datosDeBloqueo(j, msg) : null
    } catch {
      msg = `Error ${res.status}`
    }
    if (bloqueo !== null) authEvents?.bloqueada(bloqueo.texto)
    else if (res.status === 401 && !esRutaDeLogin(path)) authEvents?.noAutenticado()
    throw new ApiError(msg, res.status, bloqueo)
  }
  opts.onAfectadas?.(res.headers.get('X-Moni-Afectadas'))
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
