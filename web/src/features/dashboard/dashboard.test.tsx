import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'
import { failure, mockFetch } from '../../test/mockFetch'
import { CategoriasProvider } from '../../shell/CategoriasProvider'
import { DataProvider } from '../../shell/DataProvider'
import { ModalProvider } from '../../shell/ModalProvider'
import { activo, deuda, estado, inversion, recurrente, tx } from '../../test/factories'
import { Dashboard } from './index'

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
const gastoRows = () => Array.from(document.querySelectorAll('#gastos-categorias > li'))
const pill = (groupId: string, label: string) => within(document.getElementById(groupId) as HTMLElement).getByText(label)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0))
  localStorage.clear()
  Object.values(spies).forEach((s) => s.mockClear())
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Patrimonio', () => {
  it('muestra la cifra y de qué está hecha con la misma matemática de antes', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    expect(stat('stat-networth')).toHaveTextContent('$1,3M')
    expect(stat('stat-networth')).toHaveAttribute('title', '$1.320.000')
    expect(stat('dash-patrimonio')).toHaveTextContent('proyectados en 12 meses')
    expect(stat('stat-balance')).toHaveTextContent('$670k')
    expect(stat('stat-inversiones')).toHaveTextContent('$500k')
    expect(stat('stat-inversiones')).toHaveTextContent('+$100k (+25,0%)')
    expect(stat('stat-activos')).toHaveTextContent('$300k')
    expect(stat('stat-activos')).toHaveTextContent('1 activo')
    expect(stat('stat-deudas')).toHaveTextContent('−$150k')
    expect(stat('stat-deudas')).toHaveTextContent('$20.000/mes · 1 deuda')
  })

  it('muestra placeholders antes de la primera carga', () => {
    renderWithProviders(<Dashboard active />, { loaded: false })
    expect(document.getElementById('stat-networth')).toBeNull()
    expect(screen.getByLabelText('Cargando')).toBeInTheDocument()
  })

  it('cargado sin datos muestra cifras, no placeholders', () => {
    renderWithProviders(<Dashboard active />)
    expect(stat('stat-networth')).toHaveTextContent('$0')
    expect(screen.queryByLabelText('Cargando')).toBeNull()
  })

  it('cuenta posiciones cuando no hay nada invertido', () => {
    renderWithProviders(<Dashboard active />, { estado: estado({ inversiones: [inversion({ _id: 1 }), inversion({ _id: 2 })] }) })
    expect(stat('stat-inversiones')).toHaveTextContent('2 posiciones')
  })
})

describe('Este mes en tu cartera', () => {
  it('suma lo que entró menos lo que salió de la cartera, sin las tarjetas', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    const mes = stat('dash-mes')
    expect(mes).toHaveTextContent('Entró+$1.000.000')
    expect(mes).toHaveTextContent('Salió−$200.000')
    expect(mes).toHaveTextContent('Te quedó$800.000')
    expect(stat('stat-ahorro')).toHaveTextContent('Te quedó el 70,0% de lo que entró.')
  })

  it('avisa cuando salió más de lo que entró', () => {
    renderWithProviders(<Dashboard active />, {
      estado: estado({ transacciones: [tx('ingreso', 'Salario', 100000, { _id: 1, fecha: '2026-08-01' }), tx('gasto', 'Comida', 150000, { _id: 2, fecha: '2026-08-02' })] }),
    })
    expect(stat('stat-ahorro')).toHaveTextContent('Salió 50,0% más de lo que entró.')
    expect(stat('dash-mes')).toHaveTextContent('Te quedó−$50.000')
  })
})

describe('En qué se va tu plata', () => {
  it('una barra por categoría del período, 1M por defecto, con total y frase', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    expect(pill('gastos-period-pills', '1M')).toHaveAttribute('data-state', 'on')
    expect(within(stat('gastos-period-pills')).getAllByRole('radio').map((b) => b.textContent)).toEqual(['1S', '1M', '3M', '6M', '1A', 'Todo'])
    expect(gastoRows().map((r) => r.textContent)).toEqual(['Comida$200k', 'Mercado$50k'])
    expect(stat('gastos-frase')).toHaveTextContent('Comida se lleva el 80% de lo que gastaste en el último mes.')
    expect(stat('dash-gastos')).toHaveTextContent('Total gastado, con tarjetas$250.000')
    fireEvent.click(pill('gastos-period-pills', 'Todo'))
    expect(pill('gastos-period-pills', 'Todo')).toHaveAttribute('data-state', 'on')
    expect(gastoRows()[0]).toHaveTextContent('Comida$230k')
    expect(stat('gastos-frase')).toHaveTextContent('en todo el historial')
  })

  it('tocar una categoría muestra sus movimientos y atenúa las otras barras', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    const boton = within(gastoRows()[0] as HTMLElement).getByRole('button')
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(within(gastoRows()[0] as HTMLElement).getByText('Almuerzo')).toBeInTheDocument()
    expect(gastoRows()[1]?.querySelector('.opacity-30')).not.toBeNull()
    fireEvent.click(boton)
    expect(within(gastoRows()[0] as HTMLElement).queryByText('Almuerzo')).toBeNull()
  })

  it('sin gastos muestra el mensaje vacío', () => {
    renderWithProviders(<Dashboard active />, { estado: estado() })
    expect(screen.getByText('Sin gastos para este período')).toBeInTheDocument()
  })
})

describe('Cómo vas', () => {
  it('patrimonio a 6M por defecto, caminando hacia atrás desde el valor final', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    expect(stat('evol-resumen')).toHaveTextContent('Subiste +$720k desde fin de mar.: de $600k a $1,3M.')
    expect(pill('evol-period-pills', '6M')).toHaveAttribute('data-state', 'on')
  })

  it('cambia período y serie', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    fireEvent.click(pill('evol-period-pills', '3M'))
    expect(stat('evol-resumen')).toHaveTextContent('desde fin de jun.')
    fireEvent.click(pill('evol-serie', 'Inversiones'))
    expect(stat('evol-resumen')).toHaveTextContent('Te mantuviste en inversiones desde fin de jun.: de $500k a $500k.')
  })
})

describe('Últimos movimientos', () => {
  it('lista los más recientes primero con signo y tinta por tipo', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    const items = document.querySelectorAll('#recent-list .recent-item')
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('Pago deuda')
    expect(items[0]?.querySelector('.recent-amount')).toHaveTextContent('−$100.000')
    expect(items[0]?.querySelector('.recent-amount')).toHaveClass('text-muted-foreground')
    expect(items[1]?.querySelector('.recent-amount')).toHaveClass('text-foreground')
    expect(items[4]?.querySelector('.recent-amount')).toHaveTextContent('−$30.000')
  })

  it('muestra el estado vacío', () => {
    renderWithProviders(<Dashboard active />, { estado: estado() })
    expect(screen.getByText('Sin transacciones')).toBeInTheDocument()
  })
})

describe('Próximas operaciones', () => {
  const list = () => document.getElementById('dash-upcoming') as HTMLElement

  it('lists deuda, recurrente and inversion ordered by date', () => {
    renderWithProviders(<Dashboard active />, { estado: fixture() })
    const rows = list().querySelectorAll('.prox-op-row')
    expect(Array.from(rows).map((r) => r.querySelector('.prox-op-label')?.textContent)).toEqual(['Gym', 'Banco', 'CDT'])
    expect(rows[1]).toHaveTextContent('Cuota deuda')
    expect(rows[1]).toHaveTextContent('−$20.000')
    expect(rows[1]).toHaveTextContent('en 5d')
    expect(rows[1]).toHaveTextContent('20ago')
    expect(rows[2]).toHaveTextContent('+')
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
    expect(buttons[0]).toHaveAccessibleName('No tomar esta vez: Gym')
    expect(buttons[1]).toHaveAccessibleName('Registrar: Gym')
  })
})

describe('antes de la primera carga', () => {
  const STORED = ['deuda:1:2026-08-20', 'deuda:9:2020-01-01']
  const stored = () => JSON.parse(localStorage.getItem('moni_skipped_ops') ?? '[]') as string[]
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

  it('no dibuja listas ni mensajes vacíos, y no toca moni_skipped_ops', () => {
    localStorage.setItem('moni_skipped_ops', JSON.stringify(STORED))
    renderWithProviders(<Dashboard active />, { loaded: false, estado: estado() })
    expect(document.getElementById('dash-upcoming')).toBeNull()
    expect(document.getElementById('recent-list')).toBeNull()
    expect(screen.queryByText('Sin gastos para este período')).toBeNull()
    expect(screen.queryByText('Sin transacciones')).toBeNull()
    expect(screen.queryByText('Sin operaciones en los próximos 45 días.')).toBeNull()
    expect(stored()).toEqual(STORED)
  })

  it('una carga fallida muestra los vacíos pero no poda moni_skipped_ops', async () => {
    localStorage.setItem('moni_skipped_ops', JSON.stringify(STORED))
    mockFetch({ 'GET /api/all': failure(500, 'caído') })
    live()
    expect(await screen.findByText('Sin operaciones en los próximos 45 días.')).toBeInTheDocument()
    expect(screen.getByText('Sin gastos para este período')).toBeInTheDocument()
    expect(stored()).toEqual(STORED)
  })

  it('una carga exitosa poda las claves que ya no son candidatas', async () => {
    localStorage.setItem('moni_skipped_ops', JSON.stringify(STORED))
    mockFetch({ 'GET /api/all': { transacciones: [], deudas: [deuda({ id: 1, saldo_actual: 100, proxima_cuota: '2026-08-20' })], inversiones: [], activos: [], recurrentes: [] } })
    live()
    await waitFor(() => expect(stored()).toEqual(['deuda:1:2026-08-20']))
    expect(screen.queryByText('Banco')).toBeNull()
  })
})

describe('Lo que viene', () => {
  it('resume cuánto hay por pagar y cuántos pagos están vencidos', () => {
    const { unmount } = renderWithProviders(<Dashboard active />, { estado: fixture() })
    expect(stat('dash-proximas')).toHaveTextContent('$70.000 por pagar en los próximos 45 días.')
    unmount()
    renderWithProviders(<Dashboard active />, { estado: estado({ deudas: [deuda({ _id: 1, nombre: 'Banco', saldo_actual: 1000, cuota_mensual: 20000, proxima_cuota: '2026-08-10' })] }) })
    expect(stat('dash-proximas')).toHaveTextContent('Tenés 1 pago vencido y $20.000 por pagar en 45 días.')
  })

  it('muestra 5 y despliega el resto', () => {
    const recurrentes = Array.from({ length: 7 }, (_, i) => recurrente({ _id: i + 1, nombre: `R${i + 1}`, monto: 1000, fecha_inicio: `2026-01-${String(16 + i).padStart(2, '0')}` }))
    renderWithProviders(<Dashboard active />, { estado: estado({ recurrentes }) })
    const list = () => document.getElementById('dash-upcoming') as HTMLElement
    expect(list().querySelectorAll('.prox-op-row')).toHaveLength(5)
    fireEvent.click(screen.getByText('Ver las 7'))
    expect(list().querySelectorAll('.prox-op-row')).toHaveLength(7)
  })

  it('una cuota en cero no lleva signo', () => {
    renderWithProviders(<Dashboard active />, { estado: estado({ deudas: [deuda({ _id: 1, nombre: 'Visa', saldo_actual: 1000, cuota_mensual: 0, proxima_cuota: '2026-08-20' })] }) })
    const row = document.querySelector('.prox-op-row') as HTMLElement
    expect(row).toHaveTextContent('Visa')
    expect(row.textContent).not.toMatch(/[+−]\$0/)
  })
})
