import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cop, setCurrencySymbol } from '../../lib/format'
import { ESTADO_INICIAL, failure, json, mockFetch } from '../../test/mockFetch'
import { estado as estadoFactory } from '../../test/factories'
import { DataProvider, ESTADO_VACIO, useData } from '@/shell/providers/DataProvider'

function Harness() {
  const { estado, reload, banner } = useData()
  return (
    <>
      <output data-testid="n">{estado.conteos.activos}</output>
      <output data-testid="banner">{banner}</output>
      <button onClick={() => void reload()}>recargar</button>
    </>
  )
}

function pendientes() {
  const resolvers: ((r: Response) => void)[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>((res) => resolvers.push(res))),
  )
  return resolvers
}

async function entregar(fn: () => void) {
  await act(async () => {
    fn()
    await Promise.resolve()
  })
}

const conActivos = (n: number) => json({ ...ESTADO_INICIAL, conteos: { activos: n, inversiones: 0 } })

afterEach(() => vi.unstubAllGlobals())

describe('DataProvider recargas superpuestas', () => {
  const montar = () =>
    render(
      <DataProvider initialEstado={ESTADO_VACIO}>
        <Harness />
      </DataProvider>,
    )

  it('una respuesta vieja que llega tarde no pisa a la nueva', async () => {
    const user = userEvent.setup()
    const res = pendientes()
    montar()
    await user.click(screen.getByText('recargar'))
    await user.click(screen.getByText('recargar'))
    await entregar(() => res[1]?.(conActivos(2)))
    expect(screen.getByTestId('n')).toHaveTextContent('2')
    await entregar(() => res[0]?.(conActivos(1)))
    expect(screen.getByTestId('n')).toHaveTextContent('2')
  })

  it('un error viejo que llega tarde no muestra banner sobre una carga nueva exitosa', async () => {
    const user = userEvent.setup()
    const res = pendientes()
    montar()
    await user.click(screen.getByText('recargar'))
    await user.click(screen.getByText('recargar'))
    await entregar(() => res[1]?.(conActivos(1)))
    await entregar(() => res[0]?.(failure(500, 'viejo')))
    expect(screen.getByTestId('banner')).toBeEmptyDOMElement()
    expect(screen.getByTestId('n')).toHaveTextContent('1')
  })
})

function Estado() {
  const { estado, loaded, versiones } = useData()
  return (
    <>
      <output data-testid="hoy">{estado.hoy}</output>
      <output data-testid="alerta">{String(estado.alertas.activos)}</output>
      <output data-testid="loaded">{String(loaded)}</output>
      <output data-testid="gen">{versiones.deudas}</output>
      <output data-testid="monto">{cop(1500)}</output>
    </>
  )
}

describe('DataProvider estado del backend', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    vi.unstubAllGlobals()
    setCurrencySymbol('$')
  })

  it('carga hoy, alertas y ajustes de /api/bootstrap y aplica el símbolo de moneda', async () => {
    const f = mockFetch({
      'GET /api/bootstrap': estadoFactory({ hoy: '2026-11-22', alertas: { activos: true, inversiones: false }, ajustes: { moneda_simbolo: 'US$' } }),
    })
    render(
      <DataProvider>
        <Estado />
      </DataProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('hoy')).toHaveTextContent('2026-11-22'))
    expect(screen.getByTestId('alerta')).toHaveTextContent('true')
    expect(screen.getByTestId('monto')).toHaveTextContent('US$1.500')
    expect(screen.getByTestId('gen')).toHaveTextContent('0')
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(1)
    expect(f.mutations()).toHaveLength(0)
  })

  it('sin datos en localStorage no llama a /api/migrar-local', async () => {
    const f = mockFetch()
    render(
      <DataProvider>
        <Estado />
      </DataProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'))
    expect(f.callsTo('POST', '/api/migrar-local')).toHaveLength(0)
  })

  it('migra localStorage una vez, borra las tres claves y luego carga', async () => {
    localStorage.setItem('moni_cats', JSON.stringify({ gasto: ['Mascotas', 3], otro: ['x'] }))
    localStorage.setItem('moni_skipped_ops', JSON.stringify(['deuda:3:2026-11-25', 7]))
    localStorage.setItem('moni_currency_symbol', 'CHF')
    const f = mockFetch({ 'POST /api/migrar-local': { categorias: 1, ops_ocultas: 1, moneda_simbolo: true } })
    render(
      <DataProvider>
        <Estado />
      </DataProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'))
    const [migracion] = f.callsTo('POST', '/api/migrar-local')
    expect(migracion?.headers['X-Moni-Request']).toBe('1')
    expect(migracion?.body).toEqual({
      categorias: { ingreso: [], gasto: ['Mascotas'], transfer: [] },
      ops_ocultas: ['deuda:3:2026-11-25'],
      moneda_simbolo: 'CHF',
    })
    expect(localStorage.getItem('moni_cats')).toBeNull()
    expect(localStorage.getItem('moni_skipped_ops')).toBeNull()
    expect(localStorage.getItem('moni_currency_symbol')).toBeNull()
    expect(f.calls.map((c) => `${c.method} ${c.url}`)).toEqual(['POST /api/migrar-local', 'GET /api/bootstrap'])
  })

  it('si la migración falla no borra nada y igual carga', async () => {
    localStorage.setItem('moni_skipped_ops', JSON.stringify(['deuda:3:2026-11-25']))
    mockFetch({ 'POST /api/migrar-local': failure(500, 'boom') })
    render(
      <DataProvider>
        <Estado />
      </DataProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'))
    expect(localStorage.getItem('moni_skipped_ops')).not.toBeNull()
  })

  it('reload sube la versión solo de las entidades afectadas, y la de todas si no se indica', async () => {
    const f = mockFetch()
    function Recargar() {
      const { reload } = useData()
      return (
        <>
          <button onClick={() => void reload(['deudas'])}>deudas</button>
          <button onClick={() => void reload()}>todas</button>
        </>
      )
    }
    const user = userEvent.setup()
    render(
      <DataProvider>
        <Estado />
        <Recargar />
      </DataProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'))
    expect(screen.getByTestId('gen')).toHaveTextContent('0')
    await user.click(screen.getByText('deudas'))
    await waitFor(() => expect(screen.getByTestId('gen')).toHaveTextContent('1'))
    await user.click(screen.getByText('todas'))
    await waitFor(() => expect(screen.getByTestId('gen')).toHaveTextContent('2'))
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(3)
  })
})
