import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { cargarMovimientos, cargarResumenDeudas, cargarResumenRecurrentes } from '../../lib/api'
import { TabActivaProvider } from '@/shell/layout/TabActiva'
import { failure, mockFetch } from '../../test/mockFetch'
import { DataProvider, ESTADO_VACIO, useData } from '@/shell/providers/DataProvider'
import { useVista } from '@/shell/hooks/useVista'

function Harness({ clave }: { clave: string | null }) {
  const { data, loading, error } = useVista(clave, cargarMovimientos.bind(null, 3), ['transacciones'])
  const { reload, banner } = useData()
  return (
    <>
      <output data-testid="n">{data?.items.length ?? '-'}</output>
      <output data-testid="loading">{String(loading)}</output>
      <output data-testid="error">{error}</output>
      <output data-testid="banner">{banner}</output>
      <button onClick={() => void reload(['transacciones'])}>recargar</button>
    </>
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('useVista', () => {
  it('carga al montar y vuelve a pedir cuando reload() sube la versión', async () => {
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

  it('una mutación de deuda refetchea las vistas de deudas y no la de recurrentes', async () => {
    const user = userEvent.setup()
    const f = mockFetch({
      'GET /api/deudas/resumen': { creditos: [] },
      'GET /api/rec/resumen': { ingresos: [] },
    })
    function Vistas() {
      const { reload } = useData()
      useVista('deudas', cargarResumenDeudas, ['deudas'])
      useVista('rec', cargarResumenRecurrentes, ['recurrentes'])
      return <button onClick={() => void reload(['deudas', 'transacciones'])}>mutar deuda</button>
    }
    render(
      <DataProvider initialEstado={ESTADO_VACIO}>
        <Vistas />
      </DataProvider>,
    )
    await waitFor(() => expect(f.callsTo('GET', '/api/deudas/resumen')).toHaveLength(1))
    expect(f.callsTo('GET', '/api/rec/resumen')).toHaveLength(1)
    await user.click(screen.getByText('mutar deuda'))
    await waitFor(() => expect(f.callsTo('GET', '/api/deudas/resumen')).toHaveLength(2))
    expect(f.callsTo('GET', '/api/rec/resumen')).toHaveLength(1)
  })

  it('una mutación de deuda no refetchea vistas de transacciones ni de otras entidades', async () => {
    const user = userEvent.setup()
    const f = mockFetch()
    function Vistas() {
      const { reload } = useData()
      useVista('mov', cargarMovimientos.bind(null, 3), ['transacciones'])
      useVista('rec', cargarResumenRecurrentes, ['recurrentes'])
      return <button onClick={() => void reload(['deudas'])}>mutar deuda</button>
    }
    render(
      <DataProvider initialEstado={ESTADO_VACIO}>
        <Vistas />
      </DataProvider>,
    )
    await waitFor(() => expect(f.callsTo('GET', '/api/rec/resumen')).toHaveLength(1))
    await user.click(screen.getByText('mutar deuda'))
    await new Promise((r) => setTimeout(r, 20))
    expect(f.callsTo('GET', '/api/rec/resumen')).toHaveLength(1)
    expect(f.callsTo('GET', '/api/dashboard/movimientos?n=3')).toHaveLength(1)
  })

  it('una vista de pestaña inactiva no pide nada hasta que se activa, y solo si cambió algo', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'GET /api/deudas/resumen': { creditos: [] } })
    function Vista() {
      useVista('deudas', cargarResumenDeudas, ['deudas'])
      return null
    }
    function Pestana({ activa }: { activa: boolean }) {
      return (
        <TabActivaProvider value={activa}>
          <Vista />
        </TabActivaProvider>
      )
    }
    function App() {
      const { reload } = useData()
      const [activa, setActiva] = useState(false)
      return (
        <>
          <button onClick={() => void reload(['deudas'])}>mutar</button>
          <button onClick={() => setActiva((a) => !a)}>alternar</button>
          <Pestana activa={activa} />
        </>
      )
    }
    render(
      <DataProvider initialEstado={ESTADO_VACIO}>
        <App />
      </DataProvider>,
    )
    await user.click(screen.getByText('mutar'))
    expect(f.callsTo('GET', '/api/deudas/resumen')).toHaveLength(0)
    await user.click(screen.getByText('alternar'))
    await waitFor(() => expect(f.callsTo('GET', '/api/deudas/resumen')).toHaveLength(1))
    await user.click(screen.getByText('alternar'))
    await user.click(screen.getByText('alternar'))
    expect(f.callsTo('GET', '/api/deudas/resumen')).toHaveLength(1)
  })
})
