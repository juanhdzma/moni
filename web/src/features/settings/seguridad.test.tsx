import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as webauthn from '@simplewebauthn/browser'
import { failure, mockFetch } from '../../test/mockFetch'
import { renderWithProviders } from '../../test/render'
import { useAuth } from '@/shell/providers/AuthProvider'
import { Seguridad } from './Seguridad'

function Fase() {
  return <output aria-label="fase">{useAuth().fase}</output>
}

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: vi.fn(() => true),
  platformAuthenticatorIsAvailable: vi.fn(() => Promise.resolve(true)),
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
}))

const PASSKEYS = [{ id: 3, nombre: 'iPhone de Juan', creada: '2026-11-01T10:00:00', ultimo_uso: '2026-11-20T08:30:00', creada_texto: '2026-11-01 05:00', ultimo_uso_texto: '2026-11-20 03:30' }]
const SESIONES = [
  { id: 1, creada: '2026-11-20T08:00:00', ultimo_uso: '2026-11-22T09:00:00', creada_texto: '2026-11-20 03:00', ultimo_uso_texto: '2026-11-22 04:00', ip: '1.2.3.4', user_agent: 'Safari', metodo: 'clave', actual: true },
  { id: 2, creada: '2026-11-10T08:00:00', ultimo_uso: '2026-11-11T09:00:00', creada_texto: '2026-11-10 03:00', ultimo_uso_texto: '2026-11-11 04:00', ip: '5.6.7.8', user_agent: 'Chrome', metodo: 'passkey', actual: false },
]

beforeEach(() => {
  localStorage.clear()
  vi.mocked(webauthn.browserSupportsWebAuthn).mockReturnValue(true)
  vi.mocked(webauthn.platformAuthenticatorIsAvailable).mockResolvedValue(true)
})
afterEach(() => vi.unstubAllGlobals())

describe('Seguridad', () => {
  it('lista passkeys y sesiones; la actual no se puede revocar', async () => {
    mockFetch({ 'GET /api/auth/passkeys': PASSKEYS, 'GET /api/auth/sesiones': SESIONES })
    renderWithProviders(<Seguridad />)
    expect(await screen.findByText('iPhone de Juan')).toBeInTheDocument()
    expect(await screen.findByText('Esta sesión')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Revocar' })).toHaveLength(1)
  })

  it('revocar una sesion hace DELETE con X-Moni-Request y recarga', async () => {
    const m = mockFetch({ 'GET /api/auth/passkeys': [], 'GET /api/auth/sesiones': SESIONES, 'DELETE /api/auth/sesiones/2': null })
    const user = userEvent.setup()
    renderWithProviders(<Seguridad />)
    await user.click(await screen.findByRole('button', { name: 'Revocar' }))
    await waitFor(() => expect(m.callsTo('DELETE', '/api/auth/sesiones/2')).toHaveLength(1))
    expect(m.callsTo('DELETE', '/api/auth/sesiones/2')[0]?.headers['X-Moni-Request']).toBe('1')
    await waitFor(() => expect(m.callsTo('GET', '/api/auth/sesiones')).toHaveLength(2))
  })

  it('eliminar un passkey hace DELETE por id', async () => {
    const m = mockFetch({ 'GET /api/auth/passkeys': PASSKEYS, 'DELETE /api/auth/passkeys/3': null })
    const user = userEvent.setup()
    renderWithProviders(<Seguridad />)
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(m.callsTo('DELETE', '/api/auth/passkeys/3')).toHaveLength(1))
    expect(m.callsTo('DELETE', '/api/auth/passkeys/3')[0]?.headers['X-Moni-Request']).toBe('1')
  })

  it('agregar passkey manda el nombre elegido', async () => {
    const credencial = { id: 'c', rawId: 'c', type: 'public-key', response: {}, clientExtensionResults: {} }
    vi.mocked(webauthn.startRegistration).mockResolvedValue(credencial as unknown as Awaited<ReturnType<typeof webauthn.startRegistration>>)
    const m = mockFetch({
      'POST /api/auth/passkey/registro/opciones': { challenge: 'r' },
      'POST /api/auth/passkey/registro/verificar': { ok: true, id: 9 },
    })
    const user = userEvent.setup()
    renderWithProviders(<Seguridad />)
    const campo = await screen.findByLabelText('Nombre del dispositivo')
    await user.clear(campo)
    await user.type(campo, 'MacBook')
    await user.click(screen.getByRole('button', { name: 'Agregar passkey' }))
    await waitFor(() => expect(m.callsTo('POST', '/api/auth/passkey/registro/verificar')).toHaveLength(1))
    expect(m.callsTo('POST', '/api/auth/passkey/registro/opciones')[0]?.body).toBeUndefined()
    expect(m.callsTo('POST', '/api/auth/passkey/registro/verificar')[0]?.body).toEqual({ ...credencial, nombre: 'MacBook' })
    expect(await screen.findByText('Passkey activada en este dispositivo')).toBeInTheDocument()
  })

  it('un error al registrar se muestra en el panel', async () => {
    vi.mocked(webauthn.startRegistration).mockRejectedValue(new Error('El dispositivo canceló'))
    mockFetch({ 'POST /api/auth/passkey/registro/opciones': { challenge: 'r' } })
    const user = userEvent.setup()
    renderWithProviders(<Seguridad />)
    await user.click(await screen.findByRole('button', { name: 'Agregar passkey' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('El dispositivo canceló')
  })

  it('sin soporte de passkeys no ofrece agregar', async () => {
    vi.mocked(webauthn.platformAuthenticatorIsAvailable).mockResolvedValue(false)
    mockFetch()
    renderWithProviders(<Seguridad />)
    expect(await screen.findByText(/no soporta passkeys/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar passkey' })).toBeNull()
  })

  it('cerrar sesion hace POST /api/auth/logout y deja la pantalla sin sesion', async () => {
    const m = mockFetch({ 'POST /api/auth/logout': { ok: true } })
    const user = userEvent.setup()
    renderWithProviders(<Seguridad />)
    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    await waitFor(() => expect(m.callsTo('POST', '/api/auth/logout')).toHaveLength(1))
    expect(m.callsTo('POST', '/api/auth/logout')[0]?.headers['X-Moni-Request']).toBe('1')
  })

  it('si el logout falla no cambia de fase y muestra el error', async () => {
    mockFetch({ 'POST /api/auth/logout': failure(500, 'caído') })
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <Seguridad />
        <Fase />
      </>,
    )
    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('fase')).toHaveTextContent('autenticado')
  })
})
