import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockFetch } from '@/test/mockFetch'
import { activarPush, desactivarPush, probarPush, pushSoportado, suscripcionActual } from '@/lib/seguridad/push'

type Pieza = 'serviceWorker' | 'PushManager' | 'Notification'

function instalar(piezas: Pieza[]) {
  if (piezas.includes('serviceWorker')) Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
  if (piezas.includes('PushManager')) vi.stubGlobal('PushManager', class {})
  if (piezas.includes('Notification')) vi.stubGlobal('Notification', { requestPermission: vi.fn() })
}

function sw(over: Record<string, unknown> = {}) {
  const sub = { toJSON: () => ({ endpoint: 'https://push/1' }), endpoint: 'https://push/1', unsubscribe: vi.fn().mockResolvedValue(true) }
  const pushManager = { subscribe: vi.fn().mockResolvedValue(sub), getSubscription: vi.fn().mockResolvedValue(sub) }
  const registro = { pushManager }
  const api = { register: vi.fn().mockResolvedValue(registro), ready: Promise.resolve(registro), getRegistration: vi.fn().mockResolvedValue(registro), ...over }
  Object.defineProperty(navigator, 'serviceWorker', { value: api, configurable: true })
  return { api, pushManager, sub }
}

const permiso = (valor: string) => vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue(valor) })

beforeEach(() => vi.unstubAllGlobals())
afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'serviceWorker')
})

describe('pushSoportado', () => {
  it('sin ninguna pieza no hay soporte', () => {
    expect(pushSoportado()).toBe(false)
  })

  it('con las tres piezas hay soporte', () => {
    instalar(['serviceWorker', 'PushManager', 'Notification'])
    expect(pushSoportado()).toBe(true)
  })

  it.each([
    ['serviceWorker', ['PushManager', 'Notification']],
    ['PushManager', ['serviceWorker', 'Notification']],
    ['Notification', ['serviceWorker', 'PushManager']],
  ] as [Pieza, Pieza[]][])('si falta solo %s no hay soporte', (_falta, presentes) => {
    instalar(presentes)
    expect(pushSoportado()).toBe(false)
  })

  it.each([['serviceWorker'], ['PushManager'], ['Notification']] as [Pieza][])('con solo %s no hay soporte', (sola) => {
    instalar([sola])
    expect(pushSoportado()).toBe(false)
  })
})

describe('activarPush', () => {
  it('permiso denegado corta todo: sin registro, sin pedir la clave y sin suscribir', async () => {
    const { api, pushManager } = sw()
    permiso('denied')
    const f = mockFetch()
    await expect(activarPush()).rejects.toThrow('Permiso de notificaciones denegado')
    expect(api.register).not.toHaveBeenCalled()
    expect(pushManager.subscribe).not.toHaveBeenCalled()
    expect(f.calls).toHaveLength(0)
  })

  it('permiso default (cerró el diálogo) tampoco avanza', async () => {
    const { api } = sw()
    permiso('default')
    mockFetch()
    await expect(activarPush()).rejects.toThrow('Permiso de notificaciones denegado')
    expect(api.register).not.toHaveBeenCalled()
  })

  it('permiso otorgado registra el sw, pide la clave, suscribe y manda la suscripción', async () => {
    const { api, pushManager } = sw()
    permiso('granted')
    const f = mockFetch({ 'GET /api/push/key': { key: 'AAAA' }, 'POST /api/push/subscribe': {} })
    await activarPush()
    expect(api.register).toHaveBeenCalledWith('/sw.js')
    expect(pushManager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: new Uint8Array([0, 0, 0]) })
    expect(f.callsTo('POST', '/api/push/subscribe')[0]).toMatchObject({ headers: { 'X-Moni-Request': '1' }, body: { endpoint: 'https://push/1' } })
  })

  it.each([
    ['AAAA', [0, 0, 0]],
    ['AA', [0]],
    ['AAA', [0, 0]],
    ['-_8', [0xfb, 0xff]],
    ['_-8', [0xff, 0xef]],
    ['-_-_', [0xfb, 0xff, 0xbf]],
    ['QUJD', [65, 66, 67]],
    ['QQ', [65]],
    ['QUI', [65, 66]],
  ])('la clave base64url %s con padding implícito se convierte en %j', async (key, bytes) => {
    const { pushManager } = sw()
    permiso('granted')
    mockFetch({ 'GET /api/push/key': { key }, 'POST /api/push/subscribe': {} })
    await activarPush()
    const llamada = pushManager.subscribe.mock.calls[0]?.[0] as { applicationServerKey: Uint8Array }
    expect([...llamada.applicationServerKey]).toEqual(bytes)
  })

  it('una clave de longitud 1 mod 4 no es base64 válido y no suscribe ni manda nada', async () => {
    const { pushManager } = sw()
    permiso('granted')
    const f = mockFetch({ 'GET /api/push/key': { key: 'AAAAA' } })
    await expect(activarPush()).rejects.toThrow()
    expect(pushManager.subscribe).not.toHaveBeenCalled()
    expect(f.callsTo('POST', '/api/push/subscribe')).toHaveLength(0)
  })
})

describe('suscripcionActual y desactivarPush', () => {
  it('sin registro del sw no hay suscripción', async () => {
    sw({ getRegistration: vi.fn().mockResolvedValue(undefined) })
    expect(await suscripcionActual()).toBeNull()
  })

  it('con registro devuelve la suscripción del pushManager', async () => {
    const { sub } = sw()
    expect(await suscripcionActual()).toBe(sub)
  })

  it('desactivar sin suscripción no llama al backend', async () => {
    const { sub, pushManager } = sw()
    pushManager.getSubscription.mockResolvedValue(null)
    const f = mockFetch()
    await desactivarPush()
    expect(f.calls).toHaveLength(0)
    expect(sub.unsubscribe).not.toHaveBeenCalled()
  })

  it('desactivar avisa al backend con el endpoint y luego cancela en el navegador', async () => {
    const { sub } = sw()
    const f = mockFetch({ 'POST /api/push/unsubscribe': {} })
    sub.unsubscribe.mockImplementation(() => {
      expect(f.callsTo('POST', '/api/push/unsubscribe')).toHaveLength(1)
      return Promise.resolve(true)
    })
    await desactivarPush()
    expect(f.callsTo('POST', '/api/push/unsubscribe')[0]?.body).toEqual({ endpoint: 'https://push/1' })
    expect(sub.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('si el backend falla no cancela la suscripción del navegador', async () => {
    const { sub } = sw()
    mockFetch({ 'POST /api/push/unsubscribe': new Response('{}', { status: 500 }) })
    await expect(desactivarPush()).rejects.toThrow('Error 500')
    expect(sub.unsubscribe).not.toHaveBeenCalled()
  })
})

describe('probarPush', () => {
  it('hace POST a /api/push/test y devuelve el conteo', async () => {
    const f = mockFetch({ 'POST /api/push/test': { enviadas: 2 } })
    expect(await probarPush()).toEqual({ enviadas: 2 })
    expect(f.callsTo('POST', '/api/push/test')[0]).toMatchObject({ headers: { 'X-Moni-Request': '1' }, body: undefined })
  })
})
