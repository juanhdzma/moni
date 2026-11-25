import { afterEach, describe, expect, it, vi } from 'vitest'
import { failure, json, mockFetch } from '@/test/mockFetch'
import { ApiError, apiFetch, get, post, query, setAuthEvents } from '@/lib/api'

function eventos() {
  const bloqueada = vi.fn()
  const noAutenticado = vi.fn()
  setAuthEvents({ bloqueada, noAutenticado })
  return { bloqueada, noAutenticado }
}

afterEach(() => {
  setAuthEvents(null)
  vi.unstubAllGlobals()
})

const respuesta = (cuerpo: Record<string, unknown>, status = 403) => json(cuerpo, status)

describe('bloqueo por reintentar_en_s', () => {
  it.each([[0], [-1], [-0.5], ['x'], [null]])('reintentar_en_s=%j no es un bloqueo: error común sin aviso', async (valor) => {
    const ev = eventos()
    mockFetch({ 'GET /api/backup': respuesta({ detail: 'Prohibido', reintentar_en_s: valor, texto: 'no debería verse' }) })
    const err = await apiFetch('/api/backup').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 403, message: 'Prohibido', reintentarEnS: null, textoBloqueo: null })
    expect(ev.bloqueada).not.toHaveBeenCalled()
    expect(ev.noAutenticado).not.toHaveBeenCalled()
  })

  it('sin el campo reintentar_en_s tampoco es bloqueo', async () => {
    const ev = eventos()
    mockFetch({ 'GET /api/backup': respuesta({ detail: 'Falta el header' }) })
    const err = await apiFetch('/api/backup').catch((e: unknown) => e)
    expect(err).toMatchObject({ status: 403, message: 'Falta el header', reintentarEnS: null, textoBloqueo: null })
    expect(ev.bloqueada).not.toHaveBeenCalled()
  })

  it('un valor fraccional se redondea hacia arriba y un string numérico cuenta', async () => {
    mockFetch({ 'GET /a': respuesta({ detail: 'd', reintentar_en_s: 1.2 }), 'GET /b': respuesta({ detail: 'd', reintentar_en_s: '30' }) })
    expect(await apiFetch('/a').catch((e: unknown) => e)).toMatchObject({ reintentarEnS: 2 })
    expect(await apiFetch('/b').catch((e: unknown) => e)).toMatchObject({ reintentarEnS: 30 })
  })

  it('sin texto usa el mensaje del detail; con texto vacío o no string también', async () => {
    const ev = eventos()
    mockFetch({
      'GET /a': respuesta({ detail: 'IP bloqueada', reintentar_en_s: 60 }),
      'GET /b': respuesta({ detail: 'IP bloqueada', reintentar_en_s: 60, texto: '' }),
      'GET /c': respuesta({ detail: 'IP bloqueada', reintentar_en_s: 60, texto: 5 }),
    })
    for (const ruta of ['/a', '/b', '/c']) {
      expect(await apiFetch(ruta).catch((e: unknown) => e)).toMatchObject({ textoBloqueo: 'IP bloqueada', reintentarEnS: 60 })
    }
    expect(ev.bloqueada).toHaveBeenCalledTimes(3)
    expect(ev.bloqueada).toHaveBeenCalledWith('IP bloqueada')
  })

  it('solo un 403 puede ser bloqueo: un 429 o 500 con reintentar_en_s es un error común', async () => {
    const ev = eventos()
    mockFetch({ 'GET /a': respuesta({ detail: 'lento', reintentar_en_s: 60 }, 429), 'GET /b': respuesta({ detail: 'caído', reintentar_en_s: 60 }, 500) })
    expect(await apiFetch('/a').catch((e: unknown) => e)).toMatchObject({ status: 429, reintentarEnS: null })
    expect(await apiFetch('/b').catch((e: unknown) => e)).toMatchObject({ status: 500, reintentarEnS: null })
    expect(ev.bloqueada).not.toHaveBeenCalled()
  })
})

describe('401 y rutas de login', () => {
  it('un 401 en una ruta de datos avisa noAutenticado una vez y no bloqueo', async () => {
    const ev = eventos()
    mockFetch({ 'GET /api/backup': failure(401, 'sesión vencida') })
    await expect(apiFetch('/api/backup')).rejects.toThrow('sesión vencida')
    expect(ev.noAutenticado).toHaveBeenCalledTimes(1)
    expect(ev.bloqueada).not.toHaveBeenCalled()
  })

  it.each(['/api/auth/login', '/api/auth/passkey/login/opciones', '/api/auth/estado'])('%s no avisa noAutenticado', async (ruta) => {
    const ev = eventos()
    mockFetch({ [`GET ${ruta}`]: failure(401, 'x') })
    await expect(apiFetch(ruta)).rejects.toThrow('x')
    expect(ev.noAutenticado).not.toHaveBeenCalled()
  })

  it('una ruta autenticada de auth sí avisa', async () => {
    const ev = eventos()
    mockFetch({ 'GET /api/auth/sesiones': failure(401, 'x') })
    await expect(apiFetch('/api/auth/sesiones')).rejects.toThrow('x')
    expect(ev.noAutenticado).toHaveBeenCalledTimes(1)
  })

  it('sin handlers registrados un 401 y un bloqueo solo lanzan el error', async () => {
    mockFetch({ 'GET /a': failure(401, 'x'), 'GET /b': respuesta({ detail: 'b', reintentar_en_s: 5 }) })
    await expect(apiFetch('/a')).rejects.toThrow('x')
    await expect(apiFetch('/b')).rejects.toMatchObject({ reintentarEnS: 5 })
  })
})

describe('body y headers', () => {
  it('un POST sin body no manda Content-Type ni body, solo X-Moni-Request', async () => {
    const f = mockFetch({ 'POST /api/push/test': {} })
    await apiFetch('/api/push/test', { method: 'POST' })
    expect(f.fn).toHaveBeenCalledWith('/api/push/test', { method: 'POST', headers: { 'X-Moni-Request': '1' }, body: undefined })
  })

  it.each([
    [null, 'null'],
    [0, '0'],
    [false, 'false'],
    ['', '""'],
    [[], '[]'],
  ])('el body %j se serializa y manda Content-Type', async (body, texto) => {
    const f = mockFetch({ 'POST /x': {} })
    await post('/x', body)
    expect(f.fn).toHaveBeenCalledWith('/x', { method: 'POST', headers: { 'X-Moni-Request': '1', 'Content-Type': 'application/json' }, body: texto })
  })

  it('get no manda header de mutación', async () => {
    const f = mockFetch({ 'GET /x': { a: 1 } })
    expect(await get('/x')).toEqual({ a: 1 })
    expect(f.fn).toHaveBeenCalledWith('/x', { method: 'GET', headers: {}, body: undefined })
  })
})

describe('mensaje de error', () => {
  const mensaje = async (cuerpo: unknown, status = 400) => {
    mockFetch({ 'GET /x': json(cuerpo, status) })
    return ((await apiFetch('/x').catch((e: unknown) => e)) as Error).message
  }

  it('un detail mixto solo conserva los msg: un string suelto queda vacío', async () => {
    expect(await mensaje({ detail: ['texto', { msg: 'a' }] })).toBe(', a')
    expect(await mensaje({ detail: [{ msg: 'a' }, null, 5, { otro: 1 }, { msg: 'b' }] })).toBe('a, , , , b')
  })

  it('un msg no string se convierte a texto', async () => {
    expect(await mensaje({ detail: [{ msg: 42 }] })).toBe('42')
  })

  it('un detail vacío, numérico u objeto cae al genérico; una lista vacía queda vacía', async () => {
    expect(await mensaje({ detail: '' }, 500)).toBe('Error 500')
    expect(await mensaje({ detail: 7 }, 500)).toBe('Error 500')
    expect(await mensaje({ detail: { a: 1 } }, 418)).toBe('Error 418')
    expect(await mensaje({ otro: 'x' }, 409)).toBe('Error 409')
    expect(await mensaje('texto plano', 502)).toBe('Error 502')
    expect(await mensaje({ detail: [] })).toBe('')
  })
})

describe('ApiError', () => {
  it('lleva nombre, status y mensaje, y sin bloqueo deja los campos en null', () => {
    const err = new ApiError('mal', 418)
    expect(err).toBeInstanceOf(Error)
    expect(err).toMatchObject({ name: 'ApiError', message: 'mal', status: 418, reintentarEnS: null, textoBloqueo: null })
  })
})

describe('respuestas exitosas', () => {
  it('avisa X-Moni-Afectadas solo en éxito', async () => {
    const visto = vi.fn()
    mockFetch({ 'POST /ok': json({}, 200, { 'X-Moni-Afectadas': 'deudas' }), 'POST /mal': failure(422, 'x') })
    await apiFetch('/ok', { method: 'POST', onAfectadas: visto })
    await apiFetch('/mal', { method: 'POST', onAfectadas: visto }).catch(() => undefined)
    expect(visto.mock.calls).toEqual([['deudas']])
  })

  it('un 204 avisa las afectadas y devuelve null', async () => {
    const visto = vi.fn()
    mockFetch({ 'DELETE /x': json(null, 204, { 'X-Moni-Afectadas': 'activos' }) })
    expect(await apiFetch('/x', { method: 'DELETE', onAfectadas: visto })).toBeNull()
    expect(visto).toHaveBeenCalledWith('activos')
  })
})

describe('query', () => {
  it('omite undefined, conserva 0 y cadenas vacías, y codifica', () => {
    expect(query({})).toBe('')
    expect(query({ a: undefined })).toBe('')
    expect(query({ a: 0, b: '', c: 'x y', d: undefined })).toBe('?a=0&b=&c=x+y')
  })
})
