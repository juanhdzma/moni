import { afterEach, expect, test, vi } from 'vitest'
import { apiAll } from '../test/factories'
import {
  agregarCategoria,
  apiFetch,
  cargarListadoTx,
  cargarResumenDeudas,
  guardarAjustes,
  loadAll,
  previewPago,
  quitarCategoria,
  restaurarOp,
} from './api'

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

test('loadAll agrega _id a cada fila y conserva lo demás tal cual llega', async () => {
  const base = apiAll()
  mockFetch({
    json: () =>
      Promise.resolve({
        ...base,
        transacciones: [{ id: 4 }],
        deudas: [{ id: 5 }],
        inversiones: [{ id: 6 }],
        activos: [{ id: 7 }],
        recurrentes: [
          { id: 8, activo: true },
          { id: 9, activo: false },
        ],
        hoy: '2026-11-22',
        ajustes: { moneda_simbolo: 'US$' },
      }),
  })
  const e = await loadAll()
  expect(e.transacciones[0]).toMatchObject({ id: 4, _id: 4 })
  expect(e.deudas[0]?._id).toBe(5)
  expect(e.inversiones[0]?._id).toBe(6)
  expect(e.activos[0]?._id).toBe(7)
  expect(e.recurrentes.map((r) => r.activo)).toEqual([true, false])
  expect(e.recurrentes[0]?._id).toBe(8)
  expect(e.hoy).toBe('2026-11-22')
  expect(e.ajustes).toEqual({ moneda_simbolo: 'US$' })
  expect(e.categorias).toEqual(base.categorias)
})

test('cargarListadoTx arma el query solo con lo definido', async () => {
  const fn = mockFetch({ json: () => Promise.resolve({}) })
  await cargarListadoTx({ col: 'monto', dir: 1, mes: '2026-11' })
  expect(fn).toHaveBeenCalledWith('/api/tx?col=monto&dir=1&mes=2026-11', expect.objectContaining({ method: 'GET' }))
  await cargarListadoTx()
  expect(fn).toHaveBeenLastCalledWith('/api/tx', expect.objectContaining({ method: 'GET' }))
})

test('los resúmenes agregan _id a las filas', async () => {
  mockFetch({
    json: () => Promise.resolve({ total: 1, creditos: [{ id: 2 }], tarjetas: [{ id: 3 }], terminadas: [{ id: 4 }] }),
  })
  const r = await cargarResumenDeudas()
  expect([r.creditos[0]?._id, r.tarjetas[0]?._id, r.terminadas[0]?._id]).toEqual([2, 3, 4])
  expect(r.total).toBe(1)
})

test('previews y mutaciones nuevas mandan método, ruta, header y body', async () => {
  const fn = mockFetch({ json: () => Promise.resolve({}) })
  const mut = { 'X-Moni-Request': '1', 'Content-Type': 'application/json' }
  await previewPago(3, { total_pagado: 10, nuevo_saldo: 5 })
  expect(fn).toHaveBeenLastCalledWith('/api/deuda/3/pago/preview', {
    method: 'POST',
    headers: mut,
    body: '{"total_pagado":10,"nuevo_saldo":5}',
  })
  await agregarCategoria('gasto', 'Mascotas')
  expect(fn).toHaveBeenLastCalledWith('/api/categorias', { method: 'POST', headers: mut, body: '{"tipo":"gasto","nombre":"Mascotas"}' })
  await quitarCategoria('gasto', 'Mascotas')
  expect(fn).toHaveBeenLastCalledWith('/api/categorias?tipo=gasto&nombre=Mascotas', {
    method: 'DELETE',
    headers: { 'X-Moni-Request': '1' },
    body: undefined,
  })
  await guardarAjustes({ moneda_simbolo: '€' })
  expect(fn).toHaveBeenLastCalledWith('/api/ajustes', { method: 'PUT', headers: mut, body: '{"moneda_simbolo":"€"}' })
  await restaurarOp('deuda:1:2026-01-01')
  expect(fn).toHaveBeenLastCalledWith('/api/ops-ocultas?clave=deuda%3A1%3A2026-01-01', {
    method: 'DELETE',
    headers: { 'X-Moni-Request': '1' },
    body: undefined,
  })
  await restaurarOp()
  expect(fn).toHaveBeenLastCalledWith('/api/ops-ocultas', { method: 'DELETE', headers: { 'X-Moni-Request': '1' }, body: undefined })
})

test('un 403 con reintentar_en_s lanza ApiError y avisa del bloqueo', async () => {
  const { ApiError, setAuthEvents } = await import('./api')
  const bloqueada = vi.fn()
  const noAutenticado = vi.fn()
  setAuthEvents({ bloqueada, noAutenticado })
  mockFetch({ ok: false, status: 403, json: () => Promise.resolve({ detail: 'IP bloqueada', reintentar_en_s: 90 }) })
  const err = await apiFetch('/api/all').catch((e: unknown) => e)
  setAuthEvents(null)
  expect(err).toBeInstanceOf(ApiError)
  expect(err).toMatchObject({ status: 403, reintentarEnS: 90, message: 'IP bloqueada' })
  expect(bloqueada).toHaveBeenCalledWith(90)
  expect(noAutenticado).not.toHaveBeenCalled()
})

test('un 401 avisa una vez salvo en las rutas de login', async () => {
  const { setAuthEvents } = await import('./api')
  const bloqueada = vi.fn()
  const noAutenticado = vi.fn()
  setAuthEvents({ bloqueada, noAutenticado })
  mockFetch({ ok: false, status: 401, json: () => Promise.resolve({ detail: 'x' }) })
  await expect(apiFetch('/api/all')).rejects.toThrow('x')
  expect(noAutenticado).toHaveBeenCalledTimes(1)
  await expect(apiFetch('/api/auth/login', { method: 'POST', body: { clave: 'a' } })).rejects.toThrow('x')
  await expect(apiFetch('/api/auth/passkey/login/verificar', { method: 'POST', body: {} })).rejects.toThrow('x')
  setAuthEvents(null)
  expect(noAutenticado).toHaveBeenCalledTimes(1)
})
