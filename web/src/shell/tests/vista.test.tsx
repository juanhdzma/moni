import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { cargarMovimientos, cargarResumenDeudas, cargarResumenRecurrentes } from '@/lib/api'
import { TabActivaProvider } from '@/shell/layout/TabActiva'
import { failure, mockFetch } from '@/test/mockFetch'
import { DataProvider, ESTADO_VACIO, useData } from '@/shell/providers/DataProvider'
import { useVista } from '@/shell/hooks/datos/useVista'

function Harness({ clave }: { clave: string | null }) {
  const { data, loading, error } = useVista(clave, cargarMovimientos, ['transacciones'])
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

async function entregar(fn: () => void) {
  await act(async () => {
    fn()
    await Promise.resolve()
  })
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
    expect(f.callsTo('GET', '/api/dashboard/movimientos')).toHaveLength(1)
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
      useVista('mov', cargarMovimientos, ['transacciones'])
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
    await act(async () => {})
    expect(f.callsTo('GET', '/api/rec/resumen')).toHaveLength(1)
    expect(f.callsTo('GET', '/api/dashboard/movimientos')).toHaveLength(1)
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

  describe('respuestas viejas con dos fetches en vuelo', () => {
    function pendientes<T>() {
      const cola: { resolver: (v: T) => void; rechazar: (e: Error) => void }[] = []
      const cargar = () => new Promise<T>((resolver, rechazar) => cola.push({ resolver, rechazar }))
      return { cola, cargar }
    }

    function Lista({ clave, cargar }: { clave: string; cargar: () => Promise<string> }) {
      const { data, loading, error } = useVista(clave, cargar, ['transacciones'])
      const { reload, banner } = useData()
      return (
        <>
          <output data-testid="data">{data ?? '-'}</output>
          <output data-testid="loading">{String(loading)}</output>
          <output data-testid="error">{error}</output>
          <output data-testid="banner">{banner}</output>
          <button onClick={() => void reload(['transacciones'])}>recargar</button>
        </>
      )
    }

    const montar = (clave: string, cargar: () => Promise<string>) =>
      render(
        <DataProvider initialEstado={ESTADO_VACIO}>
          <Lista clave={clave} cargar={cargar} />
        </DataProvider>,
      )

    it('al recargar con la misma clave, la respuesta vieja que llega tarde no pisa la nueva', async () => {
      const user = userEvent.setup()
      mockFetch()
      const { cola, cargar } = pendientes<string>()
      montar('k', cargar)
      await waitFor(() => expect(cola).toHaveLength(1))
      await user.click(screen.getByText('recargar'))
      await waitFor(() => expect(cola).toHaveLength(2))
      await entregar(() => cola[1]?.resolver('nueva'))
      expect(screen.getByTestId('data')).toHaveTextContent('nueva')
      await entregar(() => cola[0]?.resolver('vieja'))
      expect(screen.getByTestId('data')).toHaveTextContent('nueva')
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    it('un error viejo que llega tarde no pone banner ni error sobre una carga nueva exitosa', async () => {
      const user = userEvent.setup()
      mockFetch()
      const { cola, cargar } = pendientes<string>()
      montar('k', cargar)
      await waitFor(() => expect(cola).toHaveLength(1))
      await user.click(screen.getByText('recargar'))
      await waitFor(() => expect(cola).toHaveLength(2))
      await entregar(() => cola[1]?.resolver('nueva'))
      await entregar(() => cola[0]?.rechazar(new Error('viejo')))
      expect(screen.getByTestId('data')).toHaveTextContent('nueva')
      expect(screen.getByTestId('error')).toBeEmptyDOMElement()
      expect(screen.getByTestId('banner')).toBeEmptyDOMElement()
    })

    it('al cambiar de clave, la respuesta de la anterior no reemplaza la actual ni la deja cargando', async () => {
      const { cola, cargar } = pendientes<string>()
      const r = montar('a', cargar)
      await waitFor(() => expect(cola).toHaveLength(1))
      r.rerender(
        <DataProvider initialEstado={ESTADO_VACIO}>
          <Lista clave="b" cargar={cargar} />
        </DataProvider>,
      )
      await waitFor(() => expect(cola).toHaveLength(2))
      await entregar(() => cola[1]?.resolver('de b'))
      await entregar(() => cola[0]?.resolver('de a'))
      expect(screen.getByTestId('data')).toHaveTextContent('de b')
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    it('si falla la recarga, los datos anteriores de la misma clave se conservan junto al error', async () => {
      const user = userEvent.setup()
      mockFetch()
      const { cola, cargar } = pendientes<string>()
      montar('k', cargar)
      await waitFor(() => expect(cola).toHaveLength(1))
      await entregar(() => cola[0]?.resolver('primera'))
      await user.click(screen.getByText('recargar'))
      await waitFor(() => expect(cola).toHaveLength(2))
      await entregar(() => cola[1]?.rechazar(new Error('se cayó')))
      expect(screen.getByTestId('data')).toHaveTextContent('primera')
      expect(screen.getByTestId('error')).toHaveTextContent('se cayó')
      expect(screen.getByTestId('banner')).toHaveTextContent('se cayó')
    })
  })
})
