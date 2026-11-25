import { render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { failure, mockFetch } from '@/test/mockFetch'
import { META } from '@/test/meta'

type ModuloMeta = typeof import('@/shell/hooks/datos/useMeta')

async function modulo(): Promise<ModuloMeta> {
  vi.resetModules()
  return import('@/shell/hooks/datos/useMeta')
}

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

describe('cargarMetaUnaVez', () => {
  it('varias llamadas simultáneas comparten un solo fetch y devuelven la misma meta', async () => {
    const f = mockFetch()
    const { cargarMetaUnaVez } = await modulo()
    const [a, b] = await Promise.all([cargarMetaUnaVez(), cargarMetaUnaVez()])
    expect(a).toEqual(META)
    expect(b).toBe(a)
    expect(f.callsTo('GET', '/api/meta')).toHaveLength(1)
  })

  it('una vez resuelta no vuelve a pedir', async () => {
    const f = mockFetch()
    const { cargarMetaUnaVez } = await modulo()
    await cargarMetaUnaVez()
    await cargarMetaUnaVez()
    expect(f.callsTo('GET', '/api/meta')).toHaveLength(1)
  })

  it('si falla, el error se propaga y la siguiente llamada reintenta', async () => {
    const f = mockFetch({ 'GET /api/meta': failure(500, 'caído') })
    const { cargarMetaUnaVez } = await modulo()
    await expect(cargarMetaUnaVez()).rejects.toThrow('caído')
    f.set('GET /api/meta', META)
    expect(await cargarMetaUnaVez()).toEqual(META)
    expect(f.callsTo('GET', '/api/meta')).toHaveLength(2)
  })
})

describe('useMeta', () => {
  function Mostrar({ useMeta }: { useMeta: ModuloMeta['useMeta'] }) {
    return <output data-testid="m">{useMeta()?.entidades.length ?? '-'}</output>
  }

  it('empieza en null y entrega la meta cuando llega', async () => {
    mockFetch()
    const { useMeta } = await modulo()
    const { result } = renderHook(() => useMeta())
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).toEqual(META))
  })

  it('dos componentes comparten un solo fetch', async () => {
    const f = mockFetch()
    const { useMeta } = await modulo()
    render(
      <>
        <Mostrar useMeta={useMeta} />
        <Mostrar useMeta={useMeta} />
      </>,
    )
    await waitFor(() => expect(screen.getAllByTestId('m').every((n) => n.textContent === String(META.entidades.length))).toBe(true))
    expect(f.callsTo('GET', '/api/meta')).toHaveLength(1)
  })

  it('un componente que monta con la meta ya resuelta la tiene en el primer render', async () => {
    mockFetch()
    const { cargarMetaUnaVez, useMeta } = await modulo()
    await cargarMetaUnaVez()
    const { result } = renderHook(() => useMeta())
    expect(result.current).toEqual(META)
  })

  it('si el fetch falla se queda en null sin lanzar', async () => {
    const f = mockFetch({ 'GET /api/meta': failure(500, 'caído') })
    const { useMeta } = await modulo()
    const { result } = renderHook(() => useMeta())
    await waitFor(() => expect(f.callsTo('GET', '/api/meta')).toHaveLength(1))
    expect(result.current).toBeNull()
  })

  it('desmontar antes de que llegue la meta no rompe nada', async () => {
    mockFetch()
    const { useMeta } = await modulo()
    const { unmount } = renderHook(() => useMeta())
    unmount()
    await new Promise((r) => setTimeout(r, 10))
  })
})
