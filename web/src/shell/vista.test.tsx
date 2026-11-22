import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cargarMovimientos } from '../lib/api'
import { failure, mockFetch } from '../test/mockFetch'
import { DataProvider, ESTADO_VACIO, useData } from './DataProvider'
import { useVista } from './useVista'

function Harness({ clave }: { clave: string | null }) {
  const { data, loading, error } = useVista(clave, cargarMovimientos.bind(null, 3))
  const { reload, banner } = useData()
  return (
    <>
      <output data-testid="n">{data?.items.length ?? '-'}</output>
      <output data-testid="loading">{String(loading)}</output>
      <output data-testid="error">{error}</output>
      <output data-testid="banner">{banner}</output>
      <button onClick={() => void reload()}>recargar</button>
    </>
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('useVista', () => {
  it('carga al montar y vuelve a pedir cuando reload() termina', async () => {
    const user = userEvent.setup()
    let n = 1
    const f = mockFetch({ 'GET /api/dashboard/movimientos': () => ({ items: Array.from({ length: n }, (_, i) => ({ id: i })) }) })
    render(
      <DataProvider initialEstado={ESTADO_VACIO}>
        <Harness clave="mov" />
      </DataProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('n')).toHaveTextContent('1'))
    expect(f.callsTo('GET', '/api/dashboard/movimientos?n=3')).toHaveLength(1)
    n = 2
    await user.click(screen.getByText('recargar'))
    await waitFor(() => expect(screen.getByTestId('n')).toHaveTextContent('2'))
  })

  it('con clave null no pide nada', () => {
    const f = mockFetch()
    render(
      <DataProvider initialEstado={ESTADO_VACIO}>
        <Harness clave={null} />
      </DataProvider>,
    )
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
    expect(f.calls).toHaveLength(0)
  })

  it('al cambiar la clave no muestra los datos de la anterior', async () => {
    mockFetch({ 'GET /api/dashboard/movimientos': () => ({ items: [{ id: 1 }] }) })
    const r = render(
      <DataProvider initialEstado={ESTADO_VACIO}>
        <Harness clave="a" />
      </DataProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('n')).toHaveTextContent('1'))
    r.rerender(
      <DataProvider initialEstado={ESTADO_VACIO}>
        <Harness clave="b" />
      </DataProvider>,
    )
    expect(screen.getByTestId('n')).toHaveTextContent('-')
    expect(screen.getByTestId('loading')).toHaveTextContent('true')
  })

  it('un error queda en error y data se conserva', async () => {
    mockFetch({ 'GET /api/dashboard/movimientos': failure(500, 'mal') })
    render(
      <DataProvider initialEstado={ESTADO_VACIO}>
        <Harness clave="mov" />
      </DataProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('mal'))
    expect(screen.getByTestId('banner')).toHaveTextContent('mal')
    expect(screen.getByTestId('n')).toHaveTextContent('-')
  })
})
