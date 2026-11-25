import { afterEach, expect, test, vi } from 'vitest'
import { estado } from '@/test/factories'
import {
  agregarCategoria,
  apiFetch,
  cargarListadoTx,
  cargarResumenDeudas,
  cargarBootstrap,
  cargarDeuda,
  guardarAjustes,
  importarBackup,
  vaciarDatos,
  previewPago,
  quitarCategoria,
  restaurarOp,
} from './index'

function mockFetch(res: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fn = vi.fn().mockResolvedValue({ ok: true, status: 200, ...res })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

test('un GET no manda el header de mutación ni content-type', async () => {
  const fn = mockFetch({ json: () => Promise.resolve({ a: 1 }) })
  expect(await apiFetch('/api/backup')).toEqual({ a: 1 })
  expect(fn).toHaveBeenCalledWith('/api/backup', { method: 'GET', headers: {}, body: undefined })
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

test('cargarBootstrap pide /api/bootstrap y devuelve el cuerpo tal cual', async () => {
  const cuerpo = estado({ hoy: '2026-11-22', ajustes: { moneda_simbolo: 'US$' } })
  const fn = mockFetch({ json: () => Promise.resolve(cuerpo) })
  expect(await cargarBootstrap()).toEqual(cuerpo)
  expect(fn).toHaveBeenCalledWith('/api/bootstrap', { method: 'GET', headers: {}, body: undefined })
})

test('cargarDeuda pide GET /api/deuda/{id}', async () => {
  const fn = mockFetch({ json: () => Promise.resolve({ id: 5 }) })
  expect(await cargarDeuda(5)).toEqual({ id: 5 })
  expect(fn).toHaveBeenCalledWith('/api/deuda/5', { method: 'GET', headers: {}, body: undefined })
})

test('cargarListadoTx arma el query solo con lo definido', async () => {
  const fn = mockFetch({ json: () => Promise.resolve({}) })
  await cargarListadoTx({ col: 'monto', dir: 1, mes: '2026-11' })
  expect(fn).toHaveBeenCalledWith('/api/tx?col=monto&dir=1&mes=2026-11', expect.objectContaining({ method: 'GET' }))
  await cargarListadoTx()
  expect(fn).toHaveBeenLastCalledWith('/api/tx', expect.objectContaining({ method: 'GET' }))
})

test('el resumen de deudas llega con las filas tal cual, con id', async () => {
  mockFetch({
    json: () => Promise.resolve({ total: 1, creditos: [{ id: 2 }], tarjetas: [{ id: 3 }], terminadas: [{ id: 4 }] }),
  })
  const r = await cargarResumenDeudas()
  expect([r.creditos[0]?.id, r.tarjetas[0]?.id, r.terminadas[0]?.id]).toEqual([2, 3, 4])
  expect(r.total).toBe(1)
})

test('previews y mutaciones nuevas mandan método, ruta, header y body', async () => {
  const fn = mockFetch({ json: () => Promise.resolve({}) })
  const mut = { 'X-Moni-Request': '1', 'Content-Type': 'application/json' }
  await previewPago(3, { total_pagado: 10, nuevo_saldo: 5, modo: 'cuota' })
  expect(fn).toHaveBeenLastCalledWith('/api/deuda/3/pago/preview', {
    method: 'POST',
    headers: mut,
    body: '{"total_pagado":10,"nuevo_saldo":5,"modo":"cuota"}',
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
  const { ApiError, setAuthEvents } = await import('./index')
  const bloqueada = vi.fn()
  const noAutenticado = vi.fn()
  setAuthEvents({ bloqueada, noAutenticado })
  mockFetch({ ok: false, status: 403, json: () => Promise.resolve({ detail: 'IP bloqueada', reintentar_en_s: 90, texto: 'Demasiados intentos. Probá de nuevo en 2 min.' }) })
  const err = await apiFetch('/api/backup').catch((e: unknown) => e)
  setAuthEvents(null)
  expect(err).toBeInstanceOf(ApiError)
  expect(err).toMatchObject({ status: 403, reintentarEnS: 90, textoBloqueo: 'Demasiados intentos. Probá de nuevo en 2 min.', message: 'IP bloqueada' })
  expect(bloqueada).toHaveBeenCalledWith('Demasiados intentos. Probá de nuevo en 2 min.')
  expect(noAutenticado).not.toHaveBeenCalled()
})

test('un 401 avisa una vez salvo en las rutas de login', async () => {
  const { setAuthEvents } = await import('./index')
  const bloqueada = vi.fn()
  const noAutenticado = vi.fn()
  setAuthEvents({ bloqueada, noAutenticado })
  mockFetch({ ok: false, status: 401, json: () => Promise.resolve({ detail: 'x' }) })
  await expect(apiFetch('/api/backup')).rejects.toThrow('x')
  expect(noAutenticado).toHaveBeenCalledTimes(1)
  await expect(apiFetch('/api/auth/login', { method: 'POST', body: { clave: 'a' } })).rejects.toThrow('x')
  await expect(apiFetch('/api/auth/passkey/login/verificar', { method: 'POST', body: {} })).rejects.toThrow('x')
  setAuthEvents(null)
  expect(noAutenticado).toHaveBeenCalledTimes(1)
})

test('las mutaciones de configuración exponen X-Moni-Afectadas: presente, vacío y ausente', async () => {
  const con = (valor: string | null) =>
    mockFetch({ json: () => Promise.resolve({}), headers: new Headers(valor === null ? {} : { 'X-Moni-Afectadas': valor }) })
  const visto = vi.fn()
  con('categorias')
  await agregarCategoria('gasto', 'A', visto)
  con('')
  await quitarCategoria('gasto', 'A', visto)
  con(null)
  await guardarAjustes({ moneda_simbolo: '€' }, visto)
  await restaurarOp(undefined, visto)
  expect(visto.mock.calls).toEqual([['categorias'], [''], [null], [null]])
})

test('importar y vaciar mandan la clave del dueño y exponen las afectadas', async () => {
  const fn = mockFetch({ json: () => Promise.resolve({}), headers: new Headers({ 'X-Moni-Afectadas': 'transacciones' }) })
  const visto = vi.fn()
  const mut = { 'X-Moni-Request': '1', 'Content-Type': 'application/json' }
  await importarBackup({ deudas: [] }, 'secreta', visto)
  expect(fn).toHaveBeenLastCalledWith('/api/import', { method: 'POST', headers: mut, body: '{"deudas":[],"clave":"secreta"}' })
  await vaciarDatos('secreta', visto)
  expect(fn).toHaveBeenLastCalledWith('/api/truncate', { method: 'POST', headers: mut, body: '{"clave":"secreta"}' })
  expect(visto).toHaveBeenCalledTimes(2)
})
