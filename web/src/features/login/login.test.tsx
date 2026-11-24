import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as webauthn from '@simplewebauthn/browser'
import App from '../../app/App'
import { failure, json, mockFetch } from '../../test/mockFetch'

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: vi.fn(() => true),
  platformAuthenticatorIsAvailable: vi.fn(() => Promise.resolve(true)),
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
}))

const ESTADO_LOGIN = { configurado: true, autenticado: false, tiene_passkeys: false }
const ESTADO_OK = { configurado: true, autenticado: true, tiene_passkeys: false }

beforeEach(() => {
  localStorage.clear()
  vi.mocked(webauthn.browserSupportsWebAuthn).mockReturnValue(true)
  vi.mocked(webauthn.platformAuthenticatorIsAvailable).mockResolvedValue(true)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const bloqueo = (texto: string, reintentarEnS: number) => json({ detail: 'IP bloqueada', reintentar_en_s: reintentarEnS, texto }, 403)

const apiAllCalls = (m: ReturnType<typeof mockFetch>) => m.calls.filter((c) => c.url !== '/api/auth/estado' && c.url.startsWith('/api/') && !c.url.startsWith('/api/auth/'))

describe('gating', () => {
  it('sin sesion muestra el login y no pide ningun dato', async () => {
    const m = mockFetch({ 'GET /api/auth/estado': ESTADO_LOGIN })
    render(<App />)
    expect(await screen.findByLabelText('Clave')).toBeInTheDocument()
    expect(m.calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /api/auth/estado'])
    expect(apiAllCalls(m)).toEqual([])
  })

  it('autenticado monta la app y carga los datos', async () => {
    const m = mockFetch({ 'GET /api/auth/estado': ESTADO_OK })
    render(<App />)
    await waitFor(() => expect(m.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
    expect(screen.queryByLabelText('Clave')).toBeNull()
  })

  it('sin configurar no ofrece formulario', async () => {
    mockFetch({ 'GET /api/auth/estado': { ...ESTADO_LOGIN, configurado: false } })
    render(<App />)
    expect(await screen.findByText(/sin configurar/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Clave')).toBeNull()
  })

  it('un fallo de red al arrancar no abre la app y permite reintentar', async () => {
    const m = mockFetch({ 'GET /api/auth/estado': failure(500, 'caído') })
    render(<App />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(m.callsTo('GET', '/api/auth/estado')).toHaveLength(2)
    expect(apiAllCalls(m)).toEqual([])
  })

  it('una IP bloqueada al arrancar muestra el texto del backend', async () => {
    mockFetch({ 'GET /api/auth/estado': bloqueo('Demasiados intentos. Probá de nuevo en 50 min.', 3000) })
    render(<App />)
    expect(await screen.findByText('Demasiados intentos. Probá de nuevo en 50 min.')).toBeInTheDocument()
  })
})

describe('login con clave', () => {
  it('manda la clave con X-Moni-Request y despues carga los datos', async () => {
    const m = mockFetch({ 'GET /api/auth/estado': ESTADO_LOGIN, 'POST /api/auth/login': { ok: true } })
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Clave'), 'una-clave-larga')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(m.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
    const login = m.callsTo('POST', '/api/auth/login')
    expect(login).toHaveLength(1)
    expect(login[0]?.body).toEqual({ clave: 'una-clave-larga' })
    expect(login[0]?.headers['X-Moni-Request']).toBe('1')
  })

  it('401 muestra un mensaje generico, vacia el campo y no carga datos', async () => {
    const m = mockFetch({ 'GET /api/auth/estado': ESTADO_LOGIN, 'POST /api/auth/login': failure(401, 'Credenciales inválidas') })
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Clave'), 'mala')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas')
    expect(screen.getByLabelText('Clave')).toHaveValue('')
    expect(apiAllCalls(m)).toEqual([])
  })

  it('403 de bloqueo muestra el texto del backend sin reloj propio', async () => {
    mockFetch({
      'GET /api/auth/estado': ESTADO_LOGIN,
      'POST /api/auth/login': bloqueo('Demasiados intentos. Probá de nuevo en 2 h.', 7200),
    })
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Clave'), 'x')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Demasiados intentos. Probá de nuevo en 2 h.')).toBeInTheDocument()
  })

  it('tras un bloqueo, un nuevo intento exitoso entra y limpia el texto', async () => {
    const m = mockFetch({
      'GET /api/auth/estado': ESTADO_LOGIN,
      'POST /api/auth/login': bloqueo('Demasiados intentos. Probá de nuevo en 1 min.', 60),
    })
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Clave'), 'x')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await screen.findByText('Demasiados intentos. Probá de nuevo en 1 min.')
    m.set('POST /api/auth/login', { ok: true })
    await user.type(screen.getByLabelText('Clave'), 'x')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(m.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
    expect(screen.queryByText(/Demasiados intentos/)).toBeNull()
  })
})

describe('sesion vencida', () => {
  it('un 401 en un fetch de datos vuelve al login sin reintentar en bucle', async () => {
    const m = mockFetch({ 'GET /api/auth/estado': ESTADO_OK, 'GET /api/bootstrap': failure(401, 'No autenticado') })
    render(<App />)
    expect(await screen.findByLabelText('Clave')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 50))
    expect(m.callsTo('GET', '/api/bootstrap')).toHaveLength(1)
    expect(m.callsTo('GET', '/api/auth/estado')).toHaveLength(1)
  })

  it('un 403 de bloqueo en un fetch de datos vuelve al login bloqueado', async () => {
    mockFetch({ 'GET /api/auth/estado': ESTADO_OK, 'GET /api/bootstrap': bloqueo('Demasiados intentos. Probá de nuevo en 10 min.', 600) })
    render(<App />)
    expect(await screen.findByText('Demasiados intentos. Probá de nuevo en 10 min.')).toBeInTheDocument()
  })
})

describe('login con passkey', () => {
  const credencial = { id: 'abc', rawId: 'abc', type: 'public-key', response: { clientDataJSON: 'x' }, clientExtensionResults: {} }

  it('sin passkeys no muestra el boton', async () => {
    mockFetch({ 'GET /api/auth/estado': ESTADO_LOGIN })
    render(<App />)
    await screen.findByLabelText('Clave')
    expect(screen.queryByRole('button', { name: /passkey/ })).toBeNull()
  })

  it('con passkeys pide opciones, firma y verifica con la credencial', async () => {
    const opciones = { challenge: 'ch', rpId: 'localhost', allowCredentials: [] }
    vi.mocked(webauthn.startAuthentication).mockResolvedValue(credencial as unknown as Awaited<ReturnType<typeof webauthn.startAuthentication>>)
    const m = mockFetch({
      'GET /api/auth/estado': { ...ESTADO_LOGIN, tiene_passkeys: true },
      'POST /api/auth/passkey/login/opciones': opciones,
      'POST /api/auth/passkey/login/verificar': { ok: true },
    })
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Entrar con passkey' }))
    await waitFor(() => expect(m.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
    expect(webauthn.startAuthentication).toHaveBeenCalledWith({ optionsJSON: opciones })
    const opc = m.callsTo('POST', '/api/auth/passkey/login/opciones')[0]
    expect(opc?.headers['X-Moni-Request']).toBe('1')
    expect(opc?.body).toBeUndefined()
    const ver = m.callsTo('POST', '/api/auth/passkey/login/verificar')[0]
    expect(ver?.body).toEqual(credencial)
    expect(ver?.headers['X-Moni-Request']).toBe('1')
  })

  it('si el usuario cancela la passkey muestra un mensaje sin verificar nada', async () => {
    vi.mocked(webauthn.startAuthentication).mockRejectedValue(new Error('cancelado'))
    const m = mockFetch({
      'GET /api/auth/estado': { ...ESTADO_LOGIN, tiene_passkeys: true },
      'POST /api/auth/passkey/login/opciones': { challenge: 'ch' },
    })
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Entrar con passkey' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo verificar la passkey')
    expect(m.callsTo('POST', '/api/auth/passkey/login/verificar')).toHaveLength(0)
  })

  it('cancelar el prompt del sistema no muestra error', async () => {
    const cancelado = Object.assign(new Error('cancelado'), { name: 'NotAllowedError' })
    vi.mocked(webauthn.startAuthentication).mockRejectedValue(cancelado)
    mockFetch({
      'GET /api/auth/estado': { ...ESTADO_LOGIN, tiene_passkeys: true },
      'POST /api/auth/passkey/login/opciones': { challenge: 'ch' },
    })
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Entrar con passkey' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar con passkey' })).toBeEnabled())
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('una assertion invalida da el mismo mensaje generico que la clave', async () => {
    vi.mocked(webauthn.startAuthentication).mockResolvedValue(credencial as unknown as Awaited<ReturnType<typeof webauthn.startAuthentication>>)
    mockFetch({
      'GET /api/auth/estado': { ...ESTADO_LOGIN, tiene_passkeys: true },
      'POST /api/auth/passkey/login/opciones': { challenge: 'ch' },
      'POST /api/auth/passkey/login/verificar': failure(401, 'Credenciales inválidas'),
    })
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Entrar con passkey' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas')
  })

  it('sin autenticador de plataforma oculta el boton', async () => {
    vi.mocked(webauthn.platformAuthenticatorIsAvailable).mockResolvedValue(false)
    mockFetch({ 'GET /api/auth/estado': { ...ESTADO_LOGIN, tiene_passkeys: true } })
    render(<App />)
    await screen.findByLabelText('Clave')
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('button', { name: /passkey/ })).toBeNull()
  })
})

describe('oferta de passkey', () => {
  async function loginConClave(m: ReturnType<typeof mockFetch>) {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Clave'), 'una-clave-larga')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(m.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
    return user
  }

  it('se ofrece una vez tras el primer login y registra el passkey con el nombre del dispositivo', async () => {
    const opciones = { challenge: 'r', user: { id: 'u' } }
    const credencial = { id: 'nuevo', rawId: 'nuevo', type: 'public-key', response: {}, clientExtensionResults: {} }
    vi.mocked(webauthn.startRegistration).mockResolvedValue(credencial as unknown as Awaited<ReturnType<typeof webauthn.startRegistration>>)
    const m = mockFetch({
      'GET /api/auth/estado': ESTADO_LOGIN,
      'POST /api/auth/login': { ok: true },
      'POST /api/auth/passkey/registro/opciones': opciones,
      'POST /api/auth/passkey/registro/verificar': { ok: true, id: 7 },
    })
    const user = await loginConClave(m)
    await user.click(await screen.findByRole('button', { name: 'Activar' }))
    await waitFor(() => expect(m.callsTo('POST', '/api/auth/passkey/registro/verificar')).toHaveLength(1))
    expect(m.callsTo('POST', '/api/auth/passkey/registro/opciones')[0]?.body).toBeUndefined()
    expect(webauthn.startRegistration).toHaveBeenCalledWith({ optionsJSON: opciones })
    expect(m.callsTo('POST', '/api/auth/passkey/registro/verificar')[0]?.body).toEqual({ ...credencial, nombre: 'Este dispositivo' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Activar passkey' })).toBeNull())
    expect(localStorage.getItem('moni_faceid_dispositivo')).toBe('1')
  })

  it('cancelar el prompt no marca la oferta como mostrada ni muestra error, y el foco va a Activar', async () => {
    vi.mocked(webauthn.startRegistration).mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
    const m = mockFetch({
      'GET /api/auth/estado': ESTADO_LOGIN,
      'POST /api/auth/login': { ok: true },
      'POST /api/auth/passkey/registro/opciones': { challenge: 'r', user: { id: 'u' } },
    })
    const user = await loginConClave(m)
    const activar = await screen.findByRole('button', { name: 'Activar' })
    await waitFor(() => expect(activar).toHaveFocus())
    await user.click(activar)
    await waitFor(() => expect(activar).toBeEnabled())
    expect(screen.queryByRole('alert')).toBeNull()
    expect(localStorage.getItem('moni_faceid_oferta')).toBeNull()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Activar passkey' })).toBeNull()
    expect(localStorage.getItem('moni_faceid_oferta')).toBe('1')
  })

  it('Ahora no la descarta y no vuelve a aparecer', async () => {
    const m = mockFetch({ 'GET /api/auth/estado': ESTADO_LOGIN, 'POST /api/auth/login': { ok: true } })
    const user = await loginConClave(m)
    await user.click(await screen.findByRole('button', { name: 'Ahora no' }))
    expect(screen.queryByRole('dialog', { name: 'Activar passkey' })).toBeNull()
    expect(localStorage.getItem('moni_faceid_oferta')).toBe('1')
    expect(m.callsTo('POST', '/api/auth/passkey/registro/opciones')).toHaveLength(0)
  })

  it('no se ofrece si ya se mostro o el dispositivo ya tiene passkey', async () => {
    localStorage.setItem('moni_faceid_dispositivo', '1')
    const m = mockFetch({ 'GET /api/auth/estado': ESTADO_LOGIN, 'POST /api/auth/login': { ok: true } })
    await loginConClave(m)
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('dialog', { name: 'Activar passkey' })).toBeNull()
  })

  it('no se ofrece si la sesion ya estaba abierta (no fue login con clave)', async () => {
    const m = mockFetch({ 'GET /api/auth/estado': ESTADO_OK })
    render(<App />)
    await waitFor(() => expect(m.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('dialog', { name: 'Activar passkey' })).toBeNull()
  })
})
