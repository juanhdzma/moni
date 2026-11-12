import { afterEach, expect, test, vi } from 'vitest'
import { apiFetch, loadAll } from './api'

function mockFetch(res: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fn = vi.fn().mockResolvedValue({ ok: true, status: 200, ...res })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

test('un GET no manda el header de mutación ni content-type', async () => {
  const fn = mockFetch({ json: () => Promise.resolve({ a: 1 }) })
  expect(await apiFetch('/api/all')).toEqual({ a: 1 })
  expect(fn).toHaveBeenCalledWith('/api/all', { method: 'GET', headers: {}, body: undefined })
})

test('un POST manda X-Moni-Request y el JSON', async () => {
  const fn = mockFetch({ json: () => Promise.resolve({}) })
  await apiFetch('/api/tx', { method: 'POST', body: { monto: 5 } })
  expect(fn).toHaveBeenCalledWith('/api/tx', {
    method: 'POST',
    headers: { 'X-Moni-Request': '1', 'Content-Type': 'application/json' },
    body: '{"monto":5}',
  })
})

test('un DELETE manda el header y no content-type; 204 devuelve null', async () => {
  const fn = mockFetch({ status: 204 })
  expect(await apiFetch('/api/tx/3', { method: 'DELETE' })).toBeNull()
  expect(fn).toHaveBeenCalledWith('/api/tx/3', { method: 'DELETE', headers: { 'X-Moni-Request': '1' }, body: undefined })
})

test('el error de validación une los msg del detail', async () => {
  mockFetch({ ok: false, status: 422, json: () => Promise.resolve({ detail: [{ msg: 'uno' }, { msg: 'dos' }] }) })
  await expect(apiFetch('/x', { method: 'POST', body: {} })).rejects.toThrow('uno, dos')
})

test('el error con detail string usa ese texto', async () => {
  mockFetch({ ok: false, status: 403, json: () => Promise.resolve({ detail: 'Falta el header' }) })
  await expect(apiFetch('/x')).rejects.toThrow('Falta el header')
})

test('sin cuerpo JSON el error es "Error <status>"', async () => {
  mockFetch({ ok: false, status: 500, json: () => Promise.reject(new Error('no json')) })
  await expect(apiFetch('/x')).rejects.toThrow('Error 500')
  mockFetch({ ok: false, status: 502, json: () => Promise.resolve(null) })
  await expect(apiFetch('/x')).rejects.toThrow('Error 502')
})

test('loadAll agrega _id y convierte activo a booleano', async () => {
  mockFetch({
    json: () =>
      Promise.resolve({
        transacciones: [{ id: 4 }],
        deudas: [{ id: 5 }],
        inversiones: [{ id: 6 }],
        activos: [{ id: 7 }],
        recurrentes: [
          { id: 8, activo: 1 },
          { id: 9, activo: 0 },
        ],
      }),
  })
  const e = await loadAll()
  expect(e.transacciones[0]).toMatchObject({ id: 4, _id: 4 })
  expect(e.deudas[0]?._id).toBe(5)
  expect(e.inversiones[0]?._id).toBe(6)
  expect(e.activos[0]?._id).toBe(7)
  expect(e.recurrentes.map((r) => r.activo)).toEqual([true, false])
  expect(e.recurrentes[0]?._id).toBe(8)
})
