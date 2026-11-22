import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'
import { failure, mockFetch } from '../../test/mockFetch'
import { CategoriasProvider } from '../../shell/CategoriasProvider'
import { DataProvider } from '../../shell/DataProvider'
import { ModalProvider } from '../../shell/ModalProvider'
import type { EsteMes, OperacionProxima, Evolucion, GastosPeriodo, Movimientos, ProximasOperaciones, ResumenDashboard } from '../../types'
import { Dashboard } from './index'

const spies = vi.hoisted(() => ({ pay: vi.fn(), yield: vi.fn(), mat: vi.fn() }))
vi.mock('../deudas', () => ({ openDeudaPayFormById: spies.pay }))
vi.mock('../inversiones', () => ({ openInvYieldFormById: spies.yield }))
vi.mock('../recurrentes', () => ({ openRecurrenteMaterializeFormById: spies.mat }))

const RESUMEN: ResumenDashboard = {
  patrimonio: 1320000,
  efectivo: 670000,
  total_deuda: 150000,
  total_inv: 500000,
  total_activos: 300000,
  ingresos_mes: 1000000,
  gastos_mes: 200000,
  quedo_mes: 800000,
  ahorro_pct: 80,
  proy_delta: 720000,
  cuota_total: 20000,
  deudas_activas: 1,
  total_invertido: 400000,
  ganancia_inv: 100000,
  ganancia_inv_pct: 25,
  partes: [
    { id: 'activos', nombre: 'Activos', valor: 300000, negativo: false, detalle: '1 activo' },
    { id: 'inversiones', nombre: 'Inversiones', valor: 500000, negativo: false, detalle: null, detalle_tipo: 'ganancia', detalle_datos: { ganancia: 100000, ganancia_pct: 25 } },
    { id: 'balance', nombre: 'Cartera', valor: 670000, negativo: false, detalle: 'Efectivo y cuentas' },
    { id: 'deudas', nombre: 'Deudas', valor: 150000, negativo: true, detalle: null, detalle_datos: { cuota_total: 20000, n: '1 deuda' } },
  ],
  total_barra: 1620000,
  frase_mes: { tipo: 'quedo', pct: 80 },
}

const EVOLUCION: Evolucion = {
  serie: 'patrimonio',
  periodo: '6M',
  meses: 6,
  puntos: [
    { mes: 'mar', valor: 600000 },
    { mes: 'ago', valor: 1320000 },
  ],
  desde: 600000,
  hasta: 1320000,
  cambio: 720000,
  verbo: 'Subiste',
  sujeto: '',
  mes_desde: 'mar',
}

const ESTE_MES: EsteMes = {
  ingresos: 1000000,
  gastos: 200000,
  quedo: 800000,
  ahorro_pct: 80,
  frase: { tipo: 'quedo', pct: 80 },
  meses: [
    { mes: 'jul', entro: 0, salio: 30000 },
    { mes: 'ago', entro: 1000000, salio: 200000 },
  ],
}

const GASTOS: GastosPeriodo = {
  periodo: '1M',
  nombre_periodo: 'el último mes',
  total: 250000,
  max: 200000,
  top: { categoria: 'Comida', valor: 200000, pct: 80 },
  categorias: [
    { categoria: 'Comida', valor: 200000, n: 8, detalle: [{ id: 2, fecha: '2026-08-05', descripcion: 'Almuerzo', categoria: 'Comida', monto: 200000 }], restantes: 2 },
    { categoria: 'Mercado', valor: 50000, n: 1, detalle: [{ id: 3, fecha: '2026-08-06', descripcion: '', categoria: 'Mercado', monto: 50000 }], restantes: 0 },
  ],
}

const MOVIMIENTOS: Movimientos = {
  items: [
    { id: 4, fecha: '2026-08-07', tipo: 'transfer', categoria: 'Pago deuda', descripcion: '', monto: 100000 },
    { id: 3, fecha: '2026-08-06', tipo: 'gasto', categoria: 'Mercado', descripcion: '', monto: 50000 },
    { id: 1, fecha: '2026-08-01', tipo: 'ingreso', categoria: 'Salario', descripcion: '', monto: 1000000 },
  ],
}

const PROXIMAS: ProximasOperaciones = {
  hoy: '2026-08-15',
  vencidas: 0,
  salen_total: 70000,
  items: [
    { clave: 'recurrente:3:2026-08-17', tipo: 'recurrente', fuente_id: 3, fecha: '2026-08-17', dia: 17, mes_corto: 'ago', etiqueta: 'Gym', sub: 'Mensual', monto: -50000, dias: 2, texto_dias: 'en 2d', vencida: false },
    { clave: 'deuda:1:2026-08-20', tipo: 'deuda', fuente_id: 1, fecha: '2026-08-20', dia: 20, mes_corto: 'ago', etiqueta: 'Banco', sub: 'Cuota deuda', monto: -20000, dias: 5, texto_dias: 'en 5d', vencida: false },
    { clave: 'inversion:2:2026-08-20', tipo: 'inversion', fuente_id: 2, fecha: '2026-08-20', dia: 20, mes_corto: 'ago', etiqueta: 'CDT', sub: 'Rendimiento', monto: 3800, dias: 5, texto_dias: 'en 5d', vencida: false },
  ],
}

const rutas = (extra: Record<string, unknown> = {}) => ({
  'GET /api/dashboard/resumen': RESUMEN,
  'GET /api/dashboard/evolucion': EVOLUCION,
  'GET /api/dashboard/este-mes': ESTE_MES,
  'GET /api/dashboard/gastos': GASTOS,
  'GET /api/dashboard/movimientos': MOVIMIENTOS,
  'GET /api/proximas-operaciones': PROXIMAS,
  ...extra,
})

const stat = (id: string) => document.getElementById(id) as HTMLElement
const gastoRows = () => Array.from(document.querySelectorAll('#gastos-categorias > li'))
const pill = (groupId: string, label: string) => within(document.getElementById(groupId) as HTMLElement).getByText(label)
const list = () => document.getElementById('dash-upcoming') as HTMLElement

beforeEach(() => {
  Object.values(spies).forEach((s) => s.mockClear())
})

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
  })

  it('avisa cuando salió más de lo que entró', async () => {
    mockFetch(rutas({ 'GET /api/dashboard/este-mes': { ...ESTE_MES, ingresos: 100000, gastos: 150000, quedo: -50000, frase: { tipo: 'excedio', pct: 50 } } }))
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(stat('stat-ahorro')).toHaveTextContent('Salió 50,0% más de lo que entró.'))
    expect(stat('dash-mes')).toHaveTextContent('Te quedó−$50.000')
  })

  it('sin ingresos lo dice', async () => {
    mockFetch(rutas({ 'GET /api/dashboard/este-mes': { ...ESTE_MES, ingresos: 0, gastos: 0, quedo: 0, frase: { tipo: 'sin_ingresos' } } }))
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(stat('stat-ahorro')).toHaveTextContent('Todavía no entró plata este mes.'))
  })
})

describe('En qué se va tu plata', () => {
  it('una barra por categoría, con total y frase del backend', async () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(gastoRows()).toHaveLength(2))
    expect(pill('gastos-period-pills', '1M')).toHaveAttribute('data-state', 'on')
    expect(within(stat('gastos-period-pills')).getAllByRole('radio').map((b) => b.textContent)).toEqual(['1S', '1M', '3M', '6M', '1A', 'Todo'])
    expect(gastoRows().map((r) => r.textContent)).toEqual(['Comida$200k', 'Mercado$50k'])
    expect(stat('gastos-frase')).toHaveTextContent('Comida se lleva el 80% de lo que gastaste en el último mes.')
    expect(stat('dash-gastos')).toHaveTextContent('Total gastado, con tarjetas$250.000')
  })

  it('cambiar el período pide el endpoint con ese período', async () => {
    const m = mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(gastoRows()).toHaveLength(2))
    fireEvent.click(pill('gastos-period-pills', 'Todo'))
    await waitFor(() => expect(m.callsTo('GET', '/api/dashboard/gastos?periodo=ALL')).toHaveLength(1))
    expect(pill('gastos-period-pills', 'Todo')).toHaveAttribute('data-state', 'on')
  })

  it('tocar una categoría muestra su detalle, el resto y atenúa las otras barras', async () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(gastoRows()).toHaveLength(2))
    const boton = within(gastoRows()[0] as HTMLElement).getByRole('button')
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(within(gastoRows()[0] as HTMLElement).getByText('Almuerzo')).toBeInTheDocument()
    expect(within(gastoRows()[0] as HTMLElement).getByText('y 2 más en Transacciones')).toBeInTheDocument()
    expect(gastoRows()[1]?.querySelector('.opacity-30')).not.toBeNull()
    fireEvent.click(boton)
    expect(within(gastoRows()[0] as HTMLElement).queryByText('Almuerzo')).toBeNull()
  })

  it('sin gastos muestra el mensaje vacío', async () => {
    mockFetch(rutas({ 'GET /api/dashboard/gastos': { ...GASTOS, total: 0, max: 0, top: null, categorias: [] } }))
    renderWithProviders(<Dashboard active />)
    expect(await screen.findByText('Sin gastos para este período')).toBeInTheDocument()
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
    m.set('GET /api/dashboard/evolucion', { ...EVOLUCION, serie: 'inversiones', periodo: '3M', cambio: 0, verbo: 'Te mantuviste', sujeto: ' en inversiones', mes_desde: 'jun', desde: 500000, hasta: 500000 })
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

describe('Próximas operaciones', () => {
  it('lista lo que devuelve el backend en su orden', async () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await screen.findByText('Banco')
    const rows = list().querySelectorAll('.prox-op-row')
    expect(Array.from(rows).map((r) => r.querySelector('.prox-op-label')?.textContent)).toEqual(['Gym', 'Banco', 'CDT'])
    expect(rows[1]).toHaveTextContent('Cuota deuda')
    expect(rows[1]).toHaveTextContent('−$20.000')
    expect(rows[1]).toHaveTextContent('en 5d')
    expect(rows[1]).toHaveTextContent('20ago')
    expect(rows[2]).toHaveTextContent('+$3.800')
  })

  it('ocultar hace POST /api/ops-ocultas, recarga y no abre formulario', async () => {
    const m = mockFetch(rutas({ 'POST /api/ops-ocultas': { clave: 'deuda:1:2026-08-20' } }))
    renderWithProviders(<Dashboard active />)
    const row = (await screen.findByText('Banco')).closest('.prox-op-row') as HTMLElement
    m.set('GET /api/proximas-operaciones', { ...PROXIMAS, items: PROXIMAS.items.filter((i) => i.tipo !== 'deuda') })
    fireEvent.click(within(row).getByTitle('No tomar esta vez'))
    await waitFor(() => expect(within(list()).queryByText('Banco')).not.toBeInTheDocument())
    expect(m.mutations()).toEqual([
      expect.objectContaining({ method: 'POST', url: '/api/ops-ocultas', body: { clave: 'deuda:1:2026-08-20' } }),
    ])
    expect(m.mutations()[0]?.headers['X-Moni-Request']).toBe('1')
    expect(spies.pay).not.toHaveBeenCalled()
  })

  it('si ocultar falla muestra el error y no oculta nada', async () => {
    const m = mockFetch(rutas({ 'POST /api/ops-ocultas': failure(422, 'clave inválida') }))
    renderWithProviders(<Dashboard active />)
    const row = (await screen.findByText('Banco')).closest('.prox-op-row') as HTMLElement
    fireEvent.click(within(row).getByTitle('No tomar esta vez'))
    await waitFor(() => expect(m.callsTo('GET', '/api/all')).toHaveLength(1))
    expect(within(list()).getByText('Banco')).toBeInTheDocument()
  })

  it('materialize abre el formulario correcto y no oculta nada', async () => {
    const m = mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await screen.findByText('Banco')
    const click = (label: string) => fireEvent.click(within(within(list()).getByText(label).closest('.prox-op-row') as HTMLElement).getByTitle('Registrar'))
    click('Banco')
    expect(spies.pay).toHaveBeenCalledWith(expect.anything(), 1)
    click('CDT')
    expect(spies.yield).toHaveBeenCalledWith(expect.anything(), 2)
    click('Gym')
    expect(spies.mat).toHaveBeenCalledWith(expect.anything(), 3, '2026-08-17')
    expect(m.mutations()).toEqual([])
    expect(within(list()).getByText('Banco')).toBeInTheDocument()
  })

  it('muestra el mensaje vacío', async () => {
    mockFetch(rutas({ 'GET /api/proximas-operaciones': { hoy: '2026-08-15', items: [], vencidas: 0, salen_total: 0 } }))
    renderWithProviders(<Dashboard active />)
    expect(await screen.findByText('Sin operaciones en los próximos 45 días.')).toBeInTheDocument()
  })

  it('las acciones son botones alcanzables por teclado', async () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await screen.findByText('Banco')
    const buttons = within(list()).getAllByRole('button')
    expect(buttons).toHaveLength(6)
    buttons.forEach((b) => expect(b.tagName).toBe('BUTTON'))
    expect(buttons[0]).toHaveAccessibleName('No tomar esta vez: Gym')
    expect(buttons[1]).toHaveAccessibleName('Registrar: Gym')
  })

  it('resume por pagar y vencidos con los totales del backend', async () => {
    mockFetch(rutas())
    const { unmount } = renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(stat('dash-proximas')).toHaveTextContent('$70.000 por pagar en los próximos 45 días.'))
    unmount()
    mockFetch(rutas({ 'GET /api/proximas-operaciones': { ...PROXIMAS, vencidas: 1, salen_total: 20000 } }))
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(stat('dash-proximas')).toHaveTextContent('Tenés 1 pago vencido y $20.000 por pagar en 45 días.'))
  })

  it('muestra 5 y despliega el resto', async () => {
    const items = Array.from({ length: 7 }, (_, i) => ({ ...(PROXIMAS.items[0] as OperacionProxima), clave: `recurrente:${i + 1}:2026-08-17`, fuente_id: i + 1, etiqueta: `R${i + 1}` }))
    mockFetch(rutas({ 'GET /api/proximas-operaciones': { ...PROXIMAS, items } }))
    renderWithProviders(<Dashboard active />)
    await screen.findByText('Ver las 7')
    expect(list().querySelectorAll('.prox-op-row')).toHaveLength(5)
    fireEvent.click(screen.getByText('Ver las 7'))
    expect(list().querySelectorAll('.prox-op-row')).toHaveLength(7)
  })

  it('una cuota en cero no lleva signo', async () => {
    mockFetch(rutas({ 'GET /api/proximas-operaciones': { ...PROXIMAS, items: [{ ...(PROXIMAS.items[1] as OperacionProxima), etiqueta: 'Visa', monto: 0 }] } }))
    renderWithProviders(<Dashboard active />)
    const row = (await screen.findByText('Visa')).closest('.prox-op-row') as HTMLElement
    expect(row.textContent).not.toMatch(/[+−]\$0/)
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
