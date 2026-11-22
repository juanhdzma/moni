import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/render'
import { mockFetch } from '../../../test/mockFetch'
import { Dashboard } from '../index'
import { CategoriasProvider } from '@/shell/providers/CategoriasProvider'
import { DataProvider } from '@/shell/providers/DataProvider'
import { ModalProvider } from '@/shell/providers/ModalProvider'
import { ESTE_MES, EVOLUCION, frase, rutas, pill, stat } from './fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('requests', () => {
  it('pide cada vista a su endpoint con los parámetros por defecto', async () => {
    const m = mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await screen.findByText('Gym')
    const gets = m.calls.filter((c) => c.method === 'GET').map((c) => c.url)
    expect(gets).toEqual(
      expect.arrayContaining([
        '/api/dashboard/resumen',
        '/api/dashboard/evolucion?serie=patrimonio&periodo=6M',
        '/api/dashboard/este-mes',
        '/api/dashboard/gastos?periodo=1M',
        '/api/dashboard/movimientos',
        '/api/proximas-operaciones',
      ]),
    )
    expect(m.mutations()).toEqual([])
  })
})

describe('Patrimonio', () => {
  it('muestra la cifra y las partes tal como llegan del backend', async () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(stat('stat-networth')).toHaveTextContent('$1,3M'))
    expect(stat('stat-networth')).toHaveAttribute('title', '$1.320.000')
    expect(stat('dash-patrimonio')).toHaveTextContent('+$720k proyectados en 12 meses')
    expect(stat('stat-balance')).toHaveTextContent('$670k')
    expect(stat('stat-inversiones')).toHaveTextContent('+$100k (+25,0%)')
    expect(stat('stat-activos')).toHaveTextContent('1 activo')
    expect(stat('stat-deudas')).toHaveTextContent('−$150k')
    expect(stat('stat-deudas')).toHaveTextContent('$20.000/mes · 1 deuda')
  })

  it('muestra placeholder antes de la primera carga', () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />, { loaded: false })
    expect(document.getElementById('stat-networth')).toBeNull()
    expect(screen.getByLabelText('Cargando')).toBeInTheDocument()
    for (const nombre of ['Activos', 'Inversiones', 'Cartera', 'Deudas']) expect(screen.getAllByText(nombre).length).toBeGreaterThan(0)
  })
})

describe('Este mes en tu cartera', () => {
  it('muestra lo que entró, salió y quedó', async () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(stat('dash-mes')).toHaveTextContent('Entró+$1.000.000'))
    expect(stat('dash-mes')).toHaveTextContent('Salió−$200.000')
    expect(stat('dash-mes')).toHaveTextContent('Te quedó$800.000')
    expect(stat('stat-ahorro')).toHaveTextContent('Te quedó el 80,0% de lo que entró.')
    expect(stat('stat-ahorro').querySelector('.text-inversiones-text')).toHaveTextContent('80,0%')
    expect(screen.getByLabelText('Entró y salió por mes, últimos 6 meses')).toBeInTheDocument()
  })

  it('avisa cuando salió más de lo que entró', async () => {
    mockFetch(rutas({ 'GET /api/dashboard/este-mes': { ...ESTE_MES, ingresos: 100000, gastos: 150000, quedo: -50000, frase: { tipo: 'excedio', pct: 50, ...frase('Salió ', ['50,0%', 'negativo'], ' más de lo que entró.') } } }))
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(stat('stat-ahorro')).toHaveTextContent('Salió 50,0% más de lo que entró.'))
    expect(stat('stat-ahorro').querySelector('.text-deudas')).toHaveTextContent('50,0%')
    expect(stat('dash-mes')).toHaveTextContent('Te quedó−$50.000')
  })

  it('sin ingresos lo dice', async () => {
    mockFetch(rutas({ 'GET /api/dashboard/este-mes': { ...ESTE_MES, ingresos: 0, gastos: 0, quedo: 0, frase: { tipo: 'sin_ingresos', ...frase('Todavía no entró plata este mes.') } } }))
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(stat('stat-ahorro')).toHaveTextContent('Todavía no entró plata este mes.'))
  })
})

describe('Cómo vas', () => {
  it('muestra la frase del backend', async () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(stat('evol-resumen')).toHaveTextContent('Subiste +$720k desde fin de mar: de $600k a $1,3M.'))
    expect(pill('evol-period-pills', '6M')).toHaveAttribute('data-state', 'on')
  })

  it('cambiar período y serie pide el endpoint con serie y periodo', async () => {
    const m = mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(stat('evol-resumen')).toHaveTextContent('Subiste'))
    fireEvent.click(pill('evol-period-pills', '3M'))
    await waitFor(() => expect(m.callsTo('GET', '/api/dashboard/evolucion?serie=patrimonio&periodo=3M')).toHaveLength(1))
    m.set('GET /api/dashboard/evolucion', { ...EVOLUCION, serie: 'inversiones', periodo: '3M', cambio: 0, verbo: 'Te mantuviste', sujeto: ' en inversiones', mes_desde: 'jun', desde: 500000, hasta: 500000, nombre_serie: 'Inversiones', frase: frase('Te mantuviste en inversiones desde fin de jun: de $500k a ', ['$500k', 'fuerte'], '.') })
    fireEvent.click(pill('evol-serie', 'Inversiones'))
    await waitFor(() => expect(m.callsTo('GET', '/api/dashboard/evolucion?serie=inversiones&periodo=3M')).toHaveLength(1))
    await waitFor(() => expect(stat('evol-resumen')).toHaveTextContent('Te mantuviste en inversiones desde fin de jun: de $500k a $500k.'))
  })
})

describe('Últimos movimientos', () => {
  it('lista los movimientos con signo y tinta por tipo', async () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(document.querySelectorAll('#recent-list .recent-item')).toHaveLength(3))
    const items = document.querySelectorAll('#recent-list .recent-item')
    expect(items[0]).toHaveTextContent('Pago deuda')
    expect(items[0]?.querySelector('.recent-amount')).toHaveTextContent('−$100.000')
    expect(items[0]?.querySelector('.recent-amount')).toHaveClass('text-muted-foreground')
    expect(items[1]?.querySelector('.recent-amount')).toHaveClass('text-foreground')
    expect(items[2]?.querySelector('.recent-amount')).toHaveTextContent('+$1.000.000')
  })

  it('muestra el estado vacío', async () => {
    mockFetch(rutas({ 'GET /api/dashboard/movimientos': { items: [] } }))
    renderWithProviders(<Dashboard active />)
    expect(await screen.findByText('Sin transacciones')).toBeInTheDocument()
  })
})

describe('antes de la primera carga y errores', () => {
  const live = () =>
    render(
      <DataProvider>
        <CategoriasProvider>
          <ModalProvider>
            <Dashboard active />
          </ModalProvider>
        </CategoriasProvider>
      </DataProvider>,
    )

  it('no dibuja listas ni mensajes vacíos mientras llegan las vistas', () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />, { loaded: false })
    expect(document.getElementById('dash-upcoming')).toBeNull()
    expect(document.getElementById('recent-list')).toBeNull()
    expect(screen.queryByText('Sin gastos para este período')).toBeNull()
    expect(screen.queryByText('Sin transacciones')).toBeNull()
    expect(screen.queryByText('Sin operaciones en los próximos 45 días.')).toBeNull()
  })

  it('con el DataProvider real carga todo y dibuja', async () => {
    mockFetch(rutas())
    live()
    expect(await screen.findByText('Banco')).toBeInTheDocument()
    await waitFor(() => expect(stat('stat-networth')).toHaveTextContent('$1,3M'))
  })
})
