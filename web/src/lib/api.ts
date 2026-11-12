import type { ApiAll, Estado } from '../types'

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
    try {
      msg = mensajeDeError(await res.json(), res.status)
    } catch {
      msg = `Error ${res.status}`
    }
    throw new Error(msg)
  }
  if (res.status === 204) return null as T
  return (await res.json()) as T
}

export function mapAll(data: ApiAll): Estado {
  return {
    transacciones: data.transacciones.map((r) => ({ ...r, _id: r.id })),
    deudas: data.deudas.map((r) => ({ ...r, _id: r.id })),
    inversiones: data.inversiones.map((r) => ({ ...r, _id: r.id })),
    activos: data.activos.map((r) => ({ ...r, _id: r.id })),
    recurrentes: data.recurrentes.map((r) => ({ ...r, _id: r.id, activo: !!r.activo })),
  }
}

export async function loadAll(): Promise<Estado> {
  return mapAll(await apiFetch<ApiAll>('/api/all'))
}
