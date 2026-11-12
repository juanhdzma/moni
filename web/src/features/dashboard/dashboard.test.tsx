import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'
import { activo, deuda, estado, inversion, recurrente, tx } from '../../test/factories'
import { Dashboard } from './index'

interface ChartCall {
  type: string
  data: { labels?: string[]; datasets: { data?: number[]; tree?: unknown[]; borderColor?: string }[] }
  options: Record<string, unknown>
  destroyed: boolean
}

const charts = vi.hoisted(() => [] as ChartCall[])

vi.mock('./chartUtils', () => ({
  cv: (n: string) => `#${n.replace(/-/g, '')}`,
  monoFont: () => 'Mono',
  Chart: class {
    call: ChartCall
    constructor(_c: unknown, config: Omit<ChartCall, 'destroyed'>) {
      this.call = { ...config, destroyed: false }
      charts.push(this.call)
    }
    destroy() {
      this.call.destroyed = true
    }
  },
}))

const spies = vi.hoisted(() => ({ pay: vi.fn(), yield: vi.fn(), mat: vi.fn() }))
vi.mock('../deudas', () => ({ openDeudaPayFormById: spies.pay }))
vi.mock('../inversiones', () => ({ openInvYieldFormById: spies.yield }))
vi.mock('../recurrentes', () => ({ openRecurrenteMaterializeFormById: spies.mat }))

const fixture = () =>
  estado({
    transacciones: [
      tx('ingreso', 'Salario', 1000000, { _id: 1, fecha: '2026-08-01' }),
      tx('gasto', 'Comida', 200000, { _id: 2, fecha: '2026-08-05', descripcion: 'Almuerzo' }),
      tx('gasto', 'Mercado', 50000, { _id: 3, fecha: '2026-08-06', tarjeta_id: 1 }),
      tx('transfer', 'Pago deuda', 100000, { _id: 4, fecha: '2026-08-07' }),
      tx('gasto', 'Comida', 30000, { _id: 5, fecha: '2026-07-10' }),
    ],
    deudas: [deuda({ _id: 1, nombre: 'Banco', saldo_actual: 150000, cuota_mensual: 20000, proxima_cuota: '2026-08-20' })],
    inversiones: [
      inversion({ _id: 2, nombre: 'CDT', tipo: 'fija', pago: 'mensual', dia_pago: 20, tasa_ea: 12, monto_invertido: 400000, valor_actual: 500000 }),
    ],
    activos: [activo({ _id: 1, valor_actual: 300000 })],
    recurrentes: [recurrente({ _id: 3, nombre: 'Gym', monto: 50000, fecha_inicio: '2026-01-17' })],
  })

const stat = (id: string) => document.getElementById(id) as HTMLElement
const chartOf = (type: string) => charts.filter((c) => c.type === type && !c.destroyed)
const lastLine = (i: number) => chartOf('line')[i] as ChartCall

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0))
  localStorage.clear()
  charts.length = 0
  Object.values(spies).forEach((s) => s.mockClear())
  HTMLCanvasElement.prototype.getContext = (() => ({ createLinearGradient: () => ({ addColorStop: () => undefined }) })) as never
})

afterEach(() => vi.useRealTimers())

describe('Dashboard KPIs', () => {
  it('shows values from the old math', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    expect(stat('stat-networth').querySelector('.stat-value')).toHaveTextContent('$1,3M')
    expect(stat('stat-balance').querySelector('.stat-value')).toHaveTextContent('$670k')
    expect(stat('stat-balance').querySelector('.stat-sub')).toHaveTextContent('↑$1,0M · ↓$200k · +70,0% ahorro')
    expect(stat('stat-inversiones').querySelector('.stat-value')).toHaveTextContent('$500k')
    expect(stat('stat-inversiones').querySelector('.stat-sub')).toHaveTextContent('+$100k (+25,0%)')
    expect(stat('stat-activos').querySelector('.stat-value')).toHaveTextContent('$300k')
    expect(stat('stat-activos').querySelector('.stat-sub')).toHaveTextContent('1 activo')
    expect(stat('stat-deudas').querySelector('.stat-value')).toHaveTextContent('$150k')
    expect(stat('stat-deudas').querySelector('.stat-sub')).toHaveTextContent('$20.000/mes · 1 deuda')
    expect(stat('stat-networth').querySelector('.stat-value span')).toHaveStyle({ color: 'var(--income)' })
    expect(stat('stat-networth').querySelector('.stat-sub')).toHaveTextContent('proyectados próx. 12 meses')
  })

  it('shows skeletons before the first load', async () => {
    const { ESTADO_VACIO } = await import('../../shell/DataProvider')
    renderWithProviders(<Dashboard active />, { estado: ESTADO_VACIO })
    expect(stat('stat-networth').querySelector('.skeleton')).toBeInTheDocument()
  })

  it('counts positions when nothing was invested', () => {
    renderWithProviders(<Dashboard active />, { estado: estado({ inversiones: [inversion({ _id: 1 }), inversion({ _id: 2 })] }) })
    expect(stat('stat-inversiones').querySelector('.stat-sub')).toHaveTextContent('2 posiciones')
  })
})

describe('Dashboard charts', () => {
  it('draws net worth and inversiones with default 6M and walks back from the final point', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    const nw = lastLine(0)
    expect(nw.data.labels).toHaveLength(6)
    expect(nw.data.datasets[0]?.data?.at(-1)).toBe(1320000)
    expect(nw.data.datasets[0]?.data?.[4]).toBe(1320000 - (1000000 - 200000 - 50000))
    expect(nw.data.datasets[0]?.borderColor).toBe('#green')
    expect((nw.options.animation as { duration: number }).duration).toBe(600)
    const inv = lastLine(1)
    expect(inv.data.datasets[0]?.data?.at(-1)).toBe(500000)
    expect((inv.options.animation as { duration: number }).duration).toBe(400)
    expect(within(screen.getByText('Evolución net worth').parentElement as HTMLElement).getByText('6M')).toHaveClass('sel')
  })

  it('switches the net worth period and rebuilds the chart destroying the old one', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    const before = charts.filter((c) => c.type === 'line').length
    fireEvent.click(within(document.getElementById('nw-period-pills') as HTMLElement).getByText('1M'))
    expect(within(document.getElementById('nw-period-pills') as HTMLElement).getByText('1M')).toHaveClass('sel')
    expect(within(document.getElementById('nw-period-pills') as HTMLElement).getByText('6M')).not.toHaveClass('sel')
    expect(within(document.getElementById('inv-period-pills') as HTMLElement).getByText('6M')).toHaveClass('sel')
    expect(charts.filter((c) => c.type === 'line').length).toBeGreaterThan(before)
    expect(charts.filter((c) => c.type === 'line' && c.data.labels?.length === 6 && c.destroyed).length).toBeGreaterThan(0)
    expect(chartOf('line').find((c) => c.data.labels?.length === 2)).toBeTruthy()
  })

  it('gastos treemap: default 1M, tree grouped by category, pills switch to ALL', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    const pills = document.getElementById('gastos-period-pills') as HTMLElement
    expect(within(pills).getByText('1M')).toHaveClass('sel')
    expect(within(pills).getAllByRole('button').map((b) => b.textContent)).toEqual(['1W', '1M', '3M', '6M', '1Y', 'ALL'])
    expect(chartOf('treemap')[0]?.data.datasets[0]?.tree).toEqual([
      { cat: 'Comida', v: 200000 },
      { cat: 'Mercado', v: 50000 },
    ])
    fireEvent.click(within(pills).getByText('ALL'))
    expect(within(pills).getByText('ALL')).toHaveClass('sel')
    expect(chartOf('treemap')).toHaveLength(1)
    expect(chartOf('treemap')[0]?.data.datasets[0]?.tree).toEqual([
      { cat: 'Comida', v: 230000 },
      { cat: 'Mercado', v: 50000 },
    ])
  })

  it('gastos shows the empty message and no chart without expenses', () => {
    renderWithProviders(<Dashboard active />, { estado: estado() })
    expect(screen.getByText('Sin gastos para este período')).toBeInTheDocument()
    expect(chartOf('treemap')).toHaveLength(0)
  })

  it('destroys charts on unmount', () => {
    const { unmount } = renderWithProviders(<Dashboard active />, { estado: fixture() })
    unmount()
    expect(charts.every((c) => c.destroyed)).toBe(true)
  })
})

describe('Últimos movimientos', () => {
  it('lists the most recent first with sign and color', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    const items = document.querySelectorAll('#recent-list .recent-item')
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('Pago deuda')
    expect(items[0]?.querySelector('.recent-amount')).toHaveTextContent('−$100.000')
    expect(items[0]?.querySelector('.recent-amount')).toHaveStyle({ color: 'var(--transfer)' })
    expect(screen.getByText('Almuerzo')).toBeInTheDocument()
    expect(items[4]?.querySelector('.recent-amount')).toHaveTextContent('−$30.000')
  })

  it('shows the empty state', () => {
    renderWithProviders(<Dashboard active />, { estado: estado() })
    expect(screen.getByText('Sin transacciones')).toBeInTheDocument()
  })
})

describe('Próximas operaciones', () => {
  const list = () => document.getElementById('dash-upcoming') as HTMLElement

  it('lists deuda, recurrente and inversion ordered by date', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    const rows = list().querySelectorAll('.prox-op-row')
    expect(Array.from(rows).map((r) => r.querySelector('.prox-op-main div')?.textContent)).toEqual(['Gym', 'Banco', 'CDT'])
    expect(rows[1]).toHaveTextContent('Cuota deuda')
    expect(rows[1]).toHaveTextContent('−$20.000')
    expect(rows[1]).toHaveTextContent('en 5d')
    expect(rows[2]).toHaveTextContent('+')
    expect(rows[0]?.getAttribute('style')).toContain('1px solid')
    expect(rows[2]?.getAttribute('style')).not.toContain('1px solid')
  })

  it('hides ops stored in moni_skipped_ops and prunes stale keys', () => {
    localStorage.setItem('moni_skipped_ops', JSON.stringify(['deuda:1:2026-08-20', 'deuda:9:2020-01-01']))
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    expect(within(list()).queryByText('Banco')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('moni_skipped_ops') ?? '[]')).toEqual(['deuda:1:2026-08-20'])
  })

  it('skip stores the key and removes the row without opening a form', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    const row = within(list()).getByText('Banco').closest('.prox-op-row') as HTMLElement
    fireEvent.click(within(row).getByTitle('No tomar esta vez'))
    expect(JSON.parse(localStorage.getItem('moni_skipped_ops') ?? '[]')).toEqual(['deuda:1:2026-08-20'])
    expect(within(list()).queryByText('Banco')).not.toBeInTheDocument()
    expect(spies.pay).not.toHaveBeenCalled()
  })

  it('materialize opens the right form with the pending key and does not skip', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    const click = (label: string) =>
      fireEvent.click(within((within(list()).getByText(label).closest('.prox-op-row')) as HTMLElement).getByTitle('Registrar'))
    click('Banco')
    expect(spies.pay).toHaveBeenCalledWith(expect.anything(), 1)
    click('CDT')
    expect(spies.yield).toHaveBeenCalledWith(expect.anything(), 2)
    click('Gym')
    expect(spies.mat).toHaveBeenCalledWith(expect.anything(), 3, '2026-08-17')
    expect(localStorage.getItem('moni_skipped_ops')).toBeNull()
    expect(within(list()).getByText('Banco')).toBeInTheDocument()
  })

  it('shows the empty message', () => {
    renderWithProviders(<Dashboard active />, { estado: estado() })
    expect(screen.getByText('Sin operaciones en los próximos 45 días.')).toBeInTheDocument()
  })

  it('actions are keyboard reachable buttons', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    const buttons = within(list()).getAllByRole('button')
    expect(buttons).toHaveLength(6)
    buttons.forEach((b) => expect(b.tagName).toBe('BUTTON'))
    const pills = within(document.getElementById('gastos-period-pills') as HTMLElement).getAllByRole('button')
    pills.forEach((b) => expect(b).toHaveAttribute('type', 'button'))
  })
})
