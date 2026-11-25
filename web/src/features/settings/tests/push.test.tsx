import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockFetch } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { Notificaciones } from '@/features/settings/Notificaciones'

const subscription = { endpoint: 'https://fcm.googleapis.com/x', toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'p', auth: 'a' } }), unsubscribe: vi.fn(() => Promise.resolve(true)) }

function stubPush(existing: unknown = null) {
  const pushManager = { subscribe: vi.fn(() => Promise.resolve(subscription)), getSubscription: vi.fn(() => Promise.resolve(existing)) }
  const reg = { pushManager }
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', { requestPermission: vi.fn(() => Promise.resolve('granted')) })
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register: vi.fn(() => Promise.resolve(reg)), ready: Promise.resolve(reg), getRegistration: vi.fn(() => Promise.resolve(existing ? reg : undefined)) },
  })
  return pushManager
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'serviceWorker')
})

describe('notificaciones', () => {
  it('sin soporte muestra el aviso para iPhone', () => {
    mockFetch()
    renderWithProviders(<Notificaciones />)
    expect(screen.getByText(/no soporta notificaciones/)).toBeInTheDocument()
  })

  it('explica como funciona el aviso', async () => {
    stubPush()
    mockFetch()
    renderWithProviders(<Notificaciones />)
    expect(screen.getByText(/Cómo funciona/)).toBeInTheDocument()
    expect(await screen.findByText('Aviso diario a las 8:00 de las cuotas, rendimientos y recurrentes que vencen hoy o mañana.')).toBeInTheDocument()
  })

  it('probar manda el test', async () => {
    stubPush(subscription)
    const api = mockFetch({ 'POST /api/push/test': { enviadas: 1 } })
    renderWithProviders(<Notificaciones />)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar prueba' }))
    await waitFor(() => expect(api.callsTo('POST', '/api/push/test')).toHaveLength(1))
    expect(await screen.findByText('Notificación enviada')).toBeInTheDocument()
  })

  it('activar pide la clave y manda la suscripcion', async () => {
    const pushManager = stubPush()
    const api = mockFetch({ 'GET /api/push/key': { key: 'AQID' }, 'POST /api/push/subscribe': { ok: true } })
    renderWithProviders(<Notificaciones />)
    await userEvent.click(await screen.findByRole('button', { name: 'Activar en este dispositivo' }))
    await waitFor(() => expect(api.callsTo('POST', '/api/push/subscribe')).toHaveLength(1))
    expect(pushManager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: new Uint8Array([1, 2, 3]) })
    const call = api.callsTo('POST', '/api/push/subscribe')[0]
    expect(call?.headers['X-Moni-Request']).toBe('1')
    expect(call?.body).toEqual({ endpoint: subscription.endpoint, keys: { p256dh: 'p', auth: 'a' } })
    expect(await screen.findByRole('button', { name: 'Desactivar' })).toBeInTheDocument()
  })

  it('desactivar borra la suscripcion en el backend y en el navegador', async () => {
    stubPush(subscription)
    const api = mockFetch({ 'POST /api/push/unsubscribe': { ok: true } })
    renderWithProviders(<Notificaciones />)
    await userEvent.click(await screen.findByRole('button', { name: 'Desactivar' }))
    await waitFor(() => expect(api.callsTo('POST', '/api/push/unsubscribe')[0]?.body).toEqual({ endpoint: subscription.endpoint }))
    expect(subscription.unsubscribe).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Activar en este dispositivo' })).toBeInTheDocument()
  })
})
