import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as webauthn from '@simplewebauthn/browser'
import App from '@/app/App'
import { failure, mockFetch } from '@/test/mockFetch'

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: vi.fn(() => true),
  platformAuthenticatorIsAvailable: vi.fn(() => Promise.resolve(true)),
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
}))

const ESTADO_OK = { configurado: true, autenticado: true, tiene_passkeys: false }

beforeEach(() => {
  localStorage.clear()
  vi.mocked(webauthn.browserSupportsWebAuthn).mockReturnValue(true)
  vi.mocked(webauthn.platformAuthenticatorIsAvailable).mockResolvedValue(true)
})
afterEach(() => vi.unstubAllGlobals())

describe('activar en el dispositivo', () => {
  const dialogo = () => screen.queryByRole('dialog', { name: 'Activar en este dispositivo' })

  it('al abrir la app con sesion ofrece la passkey y la registra con el nombre del dispositivo', async () => {
    const opciones = { challenge: 'r', user: { id: 'u' } }
    const credencial = { id: 'nuevo', rawId: 'nuevo', type: 'public-key', response: {}, clientExtensionResults: {} }
    vi.mocked(webauthn.startRegistration).mockResolvedValue(credencial as unknown as Awaited<ReturnType<typeof webauthn.startRegistration>>)
    const m = mockFetch({
      'GET /api/auth/estado': ESTADO_OK,
      'POST /api/auth/passkey/registro/opciones': opciones,
      'POST /api/auth/passkey/registro/verificar': { ok: true, id: 7 },
    })
    const user = userEvent.setup()
    render(<App />)
    const boton = await screen.findByRole('button', { name: 'Activar passkey' })
    expect(boton).toBeDisabled()
    await user.type(screen.getByLabelText('Clave para confirmar'), 'secreta')
    await user.click(boton)
    await waitFor(() => expect(m.callsTo('POST', '/api/auth/passkey/registro/verificar')).toHaveLength(1))
    expect(m.callsTo('POST', '/api/auth/passkey/registro/opciones')[0]?.body).toEqual({ clave: 'secreta' })
    expect(webauthn.startRegistration).toHaveBeenCalledWith({ optionsJSON: opciones })
    expect(m.callsTo('POST', '/api/auth/passkey/registro/verificar')[0]?.body).toEqual({ ...credencial, nombre: 'Este dispositivo' })
    await waitFor(() => expect(dialogo()).toBeNull())
    expect(localStorage.getItem('moni_faceid_dispositivo')).toBe('1')
    expect(localStorage.getItem('moni_faceid_oferta')).toBe('1')
  })

  it('cancelar el prompt no muestra error y deja el aviso, con el foco en el campo de clave', async () => {
    vi.mocked(webauthn.startRegistration).mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
    mockFetch({ 'GET /api/auth/estado': ESTADO_OK, 'POST /api/auth/passkey/registro/opciones': { challenge: 'r', user: { id: 'u' } } })
    const user = userEvent.setup()
    render(<App />)
    const activar = await screen.findByRole('button', { name: 'Activar passkey' })
    const clave = screen.getByLabelText('Clave para confirmar')
    await waitFor(() => expect(clave).toHaveFocus())
    await user.type(clave, 'secreta')
    await user.click(activar)
    await waitFor(() => expect(activar).toBeEnabled())
    expect(screen.queryByRole('alert')).toBeNull()
    await user.keyboard('{Escape}')
    expect(dialogo()).toBeNull()
  })

  it('una clave incorrecta (403) muestra el mensaje del backend y deja el aviso', async () => {
    mockFetch({ 'GET /api/auth/estado': ESTADO_OK, 'POST /api/auth/passkey/registro/opciones': failure(403, 'Ingresá tu clave para confirmar esta acción') })
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Clave para confirmar'), 'mala')
    await user.click(screen.getByRole('button', { name: 'Activar passkey' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ingresá tu clave para confirmar esta acción')
    expect(dialogo()).not.toBeNull()
  })

  it('Tab no sale del diálogo y Escape lo cierra aunque el foco esté fuera', async () => {
    mockFetch({ 'GET /api/auth/estado': ESTADO_OK })
    const user = userEvent.setup()
    render(<App />)
    const clave = await screen.findByLabelText('Clave para confirmar')
    const ahoraNo = screen.getByRole('button', { name: 'Ahora no' })
    ahoraNo.focus()
    await user.tab()
    expect(clave).toHaveFocus()
    await user.tab({ shift: true })
    expect(ahoraNo).toHaveFocus()
    document.body.focus()
    await user.keyboard('{Escape}')
    expect(dialogo()).toBeNull()
  })

  it('Ahora no lo cierra sin pedir nada', async () => {
    const m = mockFetch({ 'GET /api/auth/estado': ESTADO_OK })
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Ahora no' }))
    expect(dialogo()).toBeNull()
    expect(m.callsTo('POST', '/api/auth/passkey/registro/opciones')).toHaveLength(0)
  })

  it('no vuelve a aparecer si ya se le pregunto antes', async () => {
    localStorage.setItem('moni_faceid_oferta', '1')
    const m = mockFetch({ 'GET /api/auth/estado': ESTADO_OK })
    render(<App />)
    await waitFor(() => expect(m.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
    await new Promise((r) => setTimeout(r, 20))
    expect(dialogo()).toBeNull()
  })

  it('no aparece si el dispositivo ya tiene passkey', async () => {
    localStorage.setItem('moni_faceid_dispositivo', '1')
    const m = mockFetch({ 'GET /api/auth/estado': ESTADO_OK })
    render(<App />)
    await waitFor(() => expect(m.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
    await new Promise((r) => setTimeout(r, 20))
    expect(dialogo()).toBeNull()
  })
})
