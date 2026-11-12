import { vi } from 'vitest'
import type { ApiAll } from '../types'

export interface RecordedCall {
  method: string
  url: string
  headers: Record<string, string>
  body: unknown
}

export type Handler = unknown

export const EMPTY_ALL: ApiAll = { transacciones: [], deudas: [], inversiones: [], activos: [], recurrentes: [] }

export const json = (body: unknown, status = 200): Response =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export const failure = (status: number, detail: unknown): Response => json({ detail }, status)

export function mockFetch(routes: Record<string, Handler> = {}) {
  const calls: RecordedCall[] = []
  const table: Record<string, Handler> = { 'GET /api/all': EMPTY_ALL, ...routes }

  const fn = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
    const call: RecordedCall = {
      method,
      url,
      headers: { ...(init?.headers as Record<string, string> | undefined) },
      body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
    }
    calls.push(call)
    const h = table[`${method} ${url}`]
    if (h === undefined) return Promise.resolve(failure(404, `sin mock: ${method} ${url}`))
    const out = typeof h === 'function' ? (h as (c: RecordedCall) => unknown)(call) : h
    return Promise.resolve(out instanceof Response ? out : json(out))
  })
  vi.stubGlobal('fetch', fn)

  return {
    fn,
    calls,
    mutations: () => calls.filter((c) => c.method !== 'GET'),
    callsTo: (method: string, url: string) => calls.filter((c) => c.method === method && c.url === url),
    set: (key: string, h: Handler) => {
      table[key] = h
    },
  }
}
