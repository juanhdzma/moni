import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch, setAuthEvents } from '@/lib/api'
import { loginConPasskey } from '@/lib/seguridad/passkeys'
import type { EstadoAuth } from '@/lib/seguridad/auth'
import { failure, json, mockFetch } from '@/test/mockFetch'
import { AuthProvider, useAuth } from '@/shell/providers/AuthProvider'

vi.mock('@/lib/seguridad/passkeys', () => ({ loginConPasskey: vi.fn() }))
vi.mock('@/lib/api', async (original) => {
  const real = await original<typeof import('@/lib/api')>()
  return { ...real, setAuthEvents: vi.fn(real.setAuthEvents) }
})

const BLOQUEO = { detail: 'IP bloqueada', reintentar_en_s: 90, texto: 'Demasiados intentos. Probá de nuevo en 2 min.' }

function Panel() {
  const { fase, tienePasskeys, textoBloqueo, entrar, entrarConPasskey, salir, recargar } = useAuth()
  const guardar = (e: unknown) => document.body.setAttribute('data-err', e instanceof Error ? e.message : '')
  return (
    <>
      <output data-testid="fase">{fase}</output>
      <output data-testid="passkeys">{String(tienePasskeys)}</output>
      <output data-testid="bloqueo">{textoBloqueo}</output>
      <button onClick={() => void entrar('clave').catch(guardar)}>entrar</button>
      <button onClick={() => void entrarConPasskey().catch(guardar)}>passkey</button>
      <button onClick={() => void salir()}>salir</button>
      <button onClick={() => void recargar()}>recargar</button>
      <button onClick={() => void apiFetch('/api/backup').catch(() => undefined)}>dato</button>
    </>
  )
}

const montar = (initialEstado?: EstadoAuth) =>
  render(
    <AuthProvider initialEstado={initialEstado}>
      <Panel />
    </AuthProvider>,
  )

const AUTENTICADO: EstadoAuth = { configurado: true, autenticado: true, tiene_passkeys: true }

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.removeAttribute('data-err')
})

describe('fase inicial', () => {
  it.each([
    [{ configurado: false, autenticado: false, tiene_passkeys: false }, 'sin_configurar'],
    [{ configurado: true, autenticado: false, tiene_passkeys: false }, 'login'],
    [{ configurado: true, autenticado: true, tiene_passkeys: false }, 'autenticado'],
    [{ configurado: false, autenticado: true, tiene_passkeys: false }, 'sin_configurar'],
  ] as [EstadoAuth, string][])('initialEstado %j da la fase %s y no consulta el backend', (estado, fase) => {
    const f = mockFetch()
    montar(estado)
    expect(screen.getByTestId('fase')).toHaveTextContent(fase)
    expect(f.calls).toHaveLength(0)
  })

  it('initialEstado copia tiene_passkeys', () => {
    mockFetch()
    montar(AUTENTICADO)
    expect(screen.getByTestId('passkeys')).toHaveTextContent('true')
  })

  it('sin initialEstado arranca cargando y consulta /api/auth/estado', async () => {
    const f = mockFetch({ 'GET /api/auth/estado': { configurado: true, autenticado: false, tiene_passkeys: true } })
    montar()
    expect(screen.getByTestId('fase')).toHaveTextContent('cargando')
    expect(screen.getByTestId('passkeys')).toHaveTextContent('false')
    await waitFor(() => expect(screen.getByTestId('fase')).toHaveTextContent('login'))
    expect(screen.getByTestId('passkeys')).toHaveTextContent('true')
    expect(f.callsTo('GET', '/api/auth/estado')).toHaveLength(1)
  })

  it('un fallo de red al arrancar da fase error y recargar lo recupera', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'GET /api/auth/estado': failure(500, 'caído') })
    montar()
    await waitFor(() => expect(screen.getByTestId('fase')).toHaveTextContent('error'))
    expect(screen.getByTestId('bloqueo')).toBeEmptyDOMElement()
    f.set('GET /api/auth/estado', { configurado: true, autenticado: true, tiene_passkeys: false })
    await user.click(screen.getByText('recargar'))
    await waitFor(() => expect(screen.getByTestId('fase')).toHaveTextContent('autenticado'))
  })

  it('una IP bloqueada al consultar el estado va a login con el texto del backend', async () => {
    mockFetch({ 'GET /api/auth/estado': json(BLOQUEO, 403) })
    montar()
    await waitFor(() => expect(screen.getByTestId('fase')).toHaveTextContent('login'))
    expect(screen.getByTestId('bloqueo')).toHaveTextContent(BLOQUEO.texto)
  })
})

describe('sesión que se cae en medio', () => {
  it('un 401 de un fetch de datos con la sesión activa vuelve al login', async () => {
    const user = userEvent.setup()
    mockFetch({ 'GET /api/backup': failure(401, 'sesión vencida') })
    montar(AUTENTICADO)
    await user.click(screen.getByText('dato'))
    await waitFor(() => expect(screen.getByTestId('fase')).toHaveTextContent('login'))
    expect(screen.getByTestId('bloqueo')).toBeEmptyDOMElement()
  })

  it.each([
    [{ configurado: false, autenticado: false, tiene_passkeys: false }, 'sin_configurar'],
    [{ configurado: true, autenticado: false, tiene_passkeys: false }, 'login'],
  ] as [EstadoAuth, string][])('un 401 con la fase %j no cambia nada (%s)', async (estado, fase) => {
    const user = userEvent.setup()
    const f = mockFetch({ 'GET /api/backup': failure(401, 'x') })
    montar(estado)
    await user.click(screen.getByText('dato'))
    await waitFor(() => expect(f.callsTo('GET', '/api/backup')).toHaveLength(1))
    await act(async () => {})
    expect(screen.getByTestId('fase')).toHaveTextContent(fase)
  })

  it('un bloqueo en un fetch de datos con la sesión activa vuelve al login con el texto', async () => {
    const user = userEvent.setup()
    mockFetch({ 'GET /api/backup': json(BLOQUEO, 403) })
    montar(AUTENTICADO)
    await user.click(screen.getByText('dato'))
    await waitFor(() => expect(screen.getByTestId('fase')).toHaveTextContent('login'))
    expect(screen.getByTestId('bloqueo')).toHaveTextContent(BLOQUEO.texto)
  })

  it('un bloqueo sin sesión previa guarda el texto pero no cambia la fase sin_configurar', async () => {
    const user = userEvent.setup()
    mockFetch({ 'GET /api/backup': json(BLOQUEO, 403) })
    montar({ configurado: false, autenticado: false, tiene_passkeys: false })
    await user.click(screen.getByText('dato'))
    await waitFor(() => expect(screen.getByTestId('bloqueo')).toHaveTextContent(BLOQUEO.texto))
    expect(screen.getByTestId('fase')).toHaveTextContent('sin_configurar')
  })
})

describe('entrar y salir', () => {
  it('login ok pasa a autenticado y manda la clave con X-Moni-Request', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/auth/login': { ok: true } })
    montar({ configurado: true, autenticado: false, tiene_passkeys: false })
    await user.click(screen.getByText('entrar'))
    await waitFor(() => expect(screen.getByTestId('fase')).toHaveTextContent('autenticado'))
    expect(f.callsTo('POST', '/api/auth/login')[0]).toMatchObject({ body: { clave: 'clave' }, headers: { 'X-Moni-Request': '1' } })
  })

  it('un bloqueo al entrar deja el texto, y un intento posterior exitoso lo limpia', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/auth/login': json(BLOQUEO, 403) })
    montar({ configurado: true, autenticado: false, tiene_passkeys: false })
    await user.click(screen.getByText('entrar'))
    await waitFor(() => expect(screen.getByTestId('bloqueo')).toHaveTextContent(BLOQUEO.texto))
    expect(screen.getByTestId('fase')).toHaveTextContent('login')
    expect(document.body.getAttribute('data-err')).toBe('IP bloqueada')
    f.set('POST /api/auth/login', { ok: true })
    await user.click(screen.getByText('entrar'))
    await waitFor(() => expect(screen.getByTestId('fase')).toHaveTextContent('autenticado'))
    expect(screen.getByTestId('bloqueo')).toBeEmptyDOMElement()
  })

  it('una clave incorrecta (401) después de un bloqueo limpia el texto y propaga el error', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/auth/login': json(BLOQUEO, 403) })
    montar({ configurado: true, autenticado: false, tiene_passkeys: false })
    await user.click(screen.getByText('entrar'))
    await waitFor(() => expect(screen.getByTestId('bloqueo')).toHaveTextContent(BLOQUEO.texto))
    f.set('POST /api/auth/login', failure(401, 'Clave incorrecta'))
    await user.click(screen.getByText('entrar'))
    await waitFor(() => expect(screen.getByTestId('bloqueo')).toBeEmptyDOMElement())
    expect(document.body.getAttribute('data-err')).toBe('Clave incorrecta')
    expect(screen.getByTestId('fase')).toHaveTextContent('login')
  })

  it('salir cierra la sesión en el backend y vuelve al login', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/auth/logout': { ok: true } })
    montar(AUTENTICADO)
    await user.click(screen.getByText('salir'))
    await waitFor(() => expect(screen.getByTestId('fase')).toHaveTextContent('login'))
    expect(f.callsTo('POST', '/api/auth/logout')).toHaveLength(1)
  })

  it('entrar con passkey ok pasa a autenticado y limpia el bloqueo; si falla propaga el error', async () => {
    const user = userEvent.setup()
    mockFetch()
    montar({ configurado: true, autenticado: false, tiene_passkeys: true })
    vi.mocked(loginConPasskey).mockRejectedValueOnce(new ApiError('IP bloqueada', 403, { reintentarEnS: 90, texto: BLOQUEO.texto }))
    await user.click(screen.getByText('passkey'))
    await waitFor(() => expect(document.body.getAttribute('data-err')).toBe('IP bloqueada'))
    expect(screen.getByTestId('fase')).toHaveTextContent('login')
    vi.mocked(loginConPasskey).mockResolvedValueOnce(undefined)
    await user.click(screen.getByText('passkey'))
    await waitFor(() => expect(screen.getByTestId('fase')).toHaveTextContent('autenticado'))
  })
})

describe('ciclo de vida', () => {
  it('useAuth fuera de AuthProvider avisa con un error claro', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => renderHook(() => useAuth())).toThrow('useAuth fuera de AuthProvider')
    consola.mockRestore()
  })

  it('al montar registra los eventos y al desmontar los retira', () => {
    mockFetch()
    vi.mocked(setAuthEvents).mockClear()
    const r = montar(AUTENTICADO)
    expect(vi.mocked(setAuthEvents).mock.calls.at(-1)?.[0]).toEqual({ noAutenticado: expect.any(Function) as unknown, bloqueada: expect.any(Function) as unknown })
    r.unmount()
    expect(vi.mocked(setAuthEvents).mock.calls.at(-1)).toEqual([null])
  })
})
