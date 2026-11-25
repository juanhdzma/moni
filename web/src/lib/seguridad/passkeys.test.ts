import { afterEach, expect, test, vi } from 'vitest'
import { mockFetch } from '@/test/mockFetch'
import { registrarPasskey } from './passkeys'

vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn().mockResolvedValue({ id: 'cred' }),
}))

afterEach(() => vi.unstubAllGlobals())

test('registrar una passkey manda la clave del dueño al pedir las opciones', async () => {
  const f = mockFetch({
    'POST /api/auth/passkey/registro/opciones': { challenge: 'r' },
    'POST /api/auth/passkey/registro/verificar': { ok: true, id: 3 },
  })
  expect(await registrarPasskey('MacBook', 'secreta')).toBe(3)
  expect(f.callsTo('POST', '/api/auth/passkey/registro/opciones')[0]?.body).toEqual({ clave: 'secreta' })
  expect(f.callsTo('POST', '/api/auth/passkey/registro/verificar')[0]?.body).toEqual({ id: 'cred', nombre: 'MacBook' })
})
