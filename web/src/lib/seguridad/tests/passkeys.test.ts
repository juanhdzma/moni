import { startAuthentication, startRegistration, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { failure, mockFetch } from '@/test/mockFetch'
import {
  dispositivoTienePasskey,
  esCancelacion,
  loginConPasskey,
  marcarOfertaMostrada,
  nombreDeDispositivo,
  ofertaYaMostrada,
  passkeysDisponibles,
  registrarPasskey,
} from '@/lib/seguridad/passkeys'

vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
  browserSupportsWebAuthn: vi.fn(),
  platformAuthenticatorIsAvailable: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(startRegistration).mockResolvedValue({ id: 'cred' } as never)
  vi.mocked(startAuthentication).mockResolvedValue({ id: 'firma' } as never)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('registrarPasskey', () => {
  it('manda la clave del dueño al pedir las opciones y el nombre al verificar', async () => {
    const f = mockFetch({
      'POST /api/auth/passkey/registro/opciones': { challenge: 'r' },
      'POST /api/auth/passkey/registro/verificar': { ok: true, id: 3 },
    })
    expect(await registrarPasskey('MacBook', 'secreta')).toBe(3)
    expect(f.callsTo('POST', '/api/auth/passkey/registro/opciones')[0]?.body).toEqual({ clave: 'secreta' })
    expect(vi.mocked(startRegistration)).toHaveBeenCalledWith({ optionsJSON: { challenge: 'r' } })
    expect(f.callsTo('POST', '/api/auth/passkey/registro/verificar')[0]?.body).toEqual({ id: 'cred', nombre: 'MacBook' })
  })

  it('marca el dispositivo solo cuando el registro termina bien', async () => {
    mockFetch({
      'POST /api/auth/passkey/registro/opciones': {},
      'POST /api/auth/passkey/registro/verificar': failure(400, 'mal'),
    })
    expect(dispositivoTienePasskey()).toBe(false)
    await expect(registrarPasskey('x', 'c')).rejects.toThrow('mal')
    expect(dispositivoTienePasskey()).toBe(false)
    mockFetch({
      'POST /api/auth/passkey/registro/opciones': {},
      'POST /api/auth/passkey/registro/verificar': { ok: true, id: 1 },
    })
    await registrarPasskey('x', 'c')
    expect(dispositivoTienePasskey()).toBe(true)
  })

  it('si el usuario cancela el prompt no verifica ni marca el dispositivo', async () => {
    const f = mockFetch({ 'POST /api/auth/passkey/registro/opciones': {} })
    vi.mocked(startRegistration).mockRejectedValue(Object.assign(new Error('cancel'), { name: 'NotAllowedError' }))
    await expect(registrarPasskey('x', 'c')).rejects.toThrow('cancel')
    expect(f.callsTo('POST', '/api/auth/passkey/registro/verificar')).toHaveLength(0)
    expect(dispositivoTienePasskey()).toBe(false)
  })
})

describe('loginConPasskey', () => {
  it('pide opciones, firma con ellas y verifica con la credencial tal cual', async () => {
    const f = mockFetch({ 'POST /api/auth/passkey/login/opciones': { challenge: 'l' }, 'POST /api/auth/passkey/login/verificar': { ok: true } })
    await loginConPasskey()
    expect(vi.mocked(startAuthentication)).toHaveBeenCalledWith({ optionsJSON: { challenge: 'l' } })
    expect(f.callsTo('POST', '/api/auth/passkey/login/verificar')[0]?.body).toEqual({ id: 'firma' })
  })

  it('una cancelación no llama a verificar', async () => {
    const f = mockFetch({ 'POST /api/auth/passkey/login/opciones': {} })
    vi.mocked(startAuthentication).mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }))
    await expect(loginConPasskey()).rejects.toThrow('x')
    expect(f.callsTo('POST', '/api/auth/passkey/login/verificar')).toHaveLength(0)
  })
})

describe('esCancelacion', () => {
  const error = (name: string, extra: Record<string, unknown> = {}) => Object.assign(new Error('x'), { name, ...extra })

  it.each([
    ['NotAllowedError', error('NotAllowedError')],
    ['AbortError', error('AbortError')],
    ['ERROR_CEREMONY_ABORTED', error('Error', { code: 'ERROR_CEREMONY_ABORTED' })],
  ])('%s es cancelación', (_n, err) => {
    expect(esCancelacion(err)).toBe(true)
  })

  it.each([
    ['otro error', error('SecurityError')],
    ['otro code', error('Error', { code: 'ERROR_INVALID_DOMAIN' })],
    ['error común', new Error('boom')],
    ['objeto con el nombre pero no Error', { name: 'NotAllowedError' }],
    ['string', 'NotAllowedError'],
    ['null', null],
    ['undefined', undefined],
  ])('%s no es cancelación', (_n, err) => {
    expect(esCancelacion(err)).toBe(false)
  })
})

describe('passkeysDisponibles', () => {
  const disponibles = (web: boolean, plataforma: boolean | 'lanza') => {
    vi.mocked(browserSupportsWebAuthn).mockReturnValue(web)
    if (plataforma === 'lanza') vi.mocked(platformAuthenticatorIsAvailable).mockRejectedValue(new Error('x'))
    else vi.mocked(platformAuthenticatorIsAvailable).mockResolvedValue(plataforma)
  }

  it('requiere WebAuthn y autenticador de plataforma', async () => {
    disponibles(true, true)
    expect(await passkeysDisponibles()).toBe(true)
    disponibles(true, false)
    expect(await passkeysDisponibles()).toBe(false)
  })

  it('sin WebAuthn no consulta al autenticador', async () => {
    disponibles(false, true)
    expect(await passkeysDisponibles()).toBe(false)
    expect(vi.mocked(platformAuthenticatorIsAvailable)).not.toHaveBeenCalled()
  })

  it('si la consulta falla responde false en vez de lanzar', async () => {
    disponibles(true, 'lanza')
    expect(await passkeysDisponibles()).toBe(false)
  })
})

describe('nombreDeDispositivo', () => {
  const conUa = (ua: string) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
    return nombreDeDispositivo()
  }

  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari', 'iPhone'],
    ['Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari', 'iPad'],
    ['Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome', 'Android'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 'Mac'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome', 'Windows'],
    ['Mozilla/5.0 (X11; Linux x86_64) Firefox', 'Este dispositivo'],
    ['', 'Este dispositivo'],
  ])('%s se llama %s', (ua, nombre) => {
    expect(conUa(ua)).toBe(nombre)
  })

  it('el orden resuelve UAs ambiguos: iPad en modo escritorio es Mac, iPhone gana sobre Macintosh', () => {
    expect(conUa('Mozilla/5.0 (iPad) Macintosh')).toBe('iPad')
    expect(conUa('Mozilla/5.0 (iPhone) Macintosh')).toBe('iPhone')
    expect(conUa('Mozilla/5.0 (Linux; Android 14) Windows')).toBe('Android')
  })
})

describe('banderas de storage', () => {
  it('la oferta se marca una sola vez y persiste', () => {
    expect(ofertaYaMostrada()).toBe(false)
    marcarOfertaMostrada()
    expect(ofertaYaMostrada()).toBe(true)
    expect(dispositivoTienePasskey()).toBe(false)
  })

  it('solo el valor "1" cuenta', () => {
    localStorage.setItem('moni_faceid_dispositivo', 'true')
    localStorage.setItem('moni_faceid_oferta', '0')
    expect(dispositivoTienePasskey()).toBe(false)
    expect(ofertaYaMostrada()).toBe(false)
  })
})
