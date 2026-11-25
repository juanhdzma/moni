import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { estado } from '@/test/factories'
import { renderWithProviders } from '@/test/render'
import { Transacciones } from '..'
import { URL_BASE, listado, mercado, salario, mockFetch, ui } from './fixtures'

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 5, 15, 10, 30) }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Transacciones tab', () => {
  it('pide GET /api/tx con orden y filtros por defecto y pinta lo devuelto', async () => {
    const f = mockFetch()
    ui()
    expect(await screen.findByText('Abril - 2026')).toBeInTheDocument()
    expect(f.callsTo('GET', URL_BASE)).toHaveLength(1)
    expect(screen.getByText('+$900.000')).toBeInTheDocument()
    expect(screen.getByText('Marzo - 2026')).toBeInTheDocument()
    expect(screen.getAllByText('Visa Oro').length).toBeGreaterThan(0)
    expect(screen.getAllByTitle('Visa Oro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Efectivo / Débito').length).toBeGreaterThan(0)
    expect(document.querySelector('img[src="/assets/franquicias/visa.svg"]')).toBeInTheDocument()
    expect(screen.getByText('Te quedó')).toBeInTheDocument()
  })

  it('shows the loading row until the first load finishes', () => {
    mockFetch()
    renderWithProviders(<Transacciones active />, { loaded: false })
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
    expect(screen.queryByText('Sin movimientos')).toBeNull()
  })

  it('shows empty state', async () => {
    mockFetch({ 'GET /api/tx': listado({ items: [], opciones: { meses: [], categorias: [], tipos: [] } }) })
    ui(estado())
    expect(await screen.findByText('Sin movimientos')).toBeInTheDocument()
  })

  it('ordena por header con click y teclado pidiendo col y dir al backend', async () => {
    const f = mockFetch()
    const user = userEvent.setup()
    ui()
    await screen.findByText('Abril - 2026')
    const fecha = screen.getByRole('columnheader', { name: 'Fecha' })
    expect(fecha.getAttribute('aria-sort')).toBe('descending')
    const monto = screen.getByRole('columnheader', { name: 'Monto' })
    await user.click(monto)
    await waitFor(() => expect(f.callsTo('GET', '/api/tx?col=monto&dir=-1&tipo=&mes=&cat=')).toHaveLength(1))
    expect(monto.getAttribute('aria-sort')).toBe('descending')
    expect(monto.className).toContain('active desc')
    expect(fecha.getAttribute('aria-sort')).toBe('none')
    monto.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(f.callsTo('GET', '/api/tx?col=monto&dir=1&tipo=&mes=&cat=')).toHaveLength(1))
    expect(monto.getAttribute('aria-sort')).toBe('ascending')
    await user.keyboard(' ')
    expect(monto.getAttribute('aria-sort')).toBe('descending')
  })

  it('sin grupo (col distinta de fecha) no pinta filas de grupo', async () => {
    mockFetch({ 'GET /api/tx': (c: { url: string }) => (c.url.includes('col=monto') ? listado({ items: [{ ...salario, grupo: null }, { ...mercado, grupo: null }] }) : listado()) })
    const user = userEvent.setup()
    ui()
    await screen.findByText('Abril - 2026')
    await user.click(screen.getByRole('columnheader', { name: 'Monto' }))
    await waitFor(() => expect(document.querySelector('.tx-group-row')).toBeNull())
    const montos = [...document.querySelectorAll('td[data-label="Monto"]')].map((c) => c.textContent)
    expect(montos[0]).toContain('900.000')
  })

  it('filtra por tipo: manda tipo al backend y pinta pills y resumen devueltos', async () => {
    const f = mockFetch({
      'GET /api/tx': (c: { url: string }) =>
        c.url.includes('tipo=gasto')
          ? listado({
              items: [mercado],
              filtros: { tipo: 'gasto', mes: '', cat: '' },
              pills: [{ campo: 'tipo', label: 'Gastos' }],
              resumen: { titulo: 'Te quedó con estos filtros', ingresos: 0, gastos: 5000, gastos_firmado: -5000, neto: -5000, dato: { texto: 'entró $0 · salió $5.000', partes: [] }, segmentos: [{ key: 'Comida', label: 'Comida', valor: 5000 }] },
            })
          : listado(),
    })
    const user = userEvent.setup()
    ui()
    await screen.findByText('Abril - 2026')
    await user.click(screen.getByRole('button', { name: 'Filtros' }))
    expect(screen.getByRole('button', { name: 'Filtros' }).getAttribute('aria-expanded')).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Tipo' }))
    await user.click(screen.getByRole('option', { name: 'Gastos' }))
    await waitFor(() => expect(f.callsTo('GET', '/api/tx?col=fecha&dir=-1&tipo=gasto&mes=&cat=')).toHaveLength(1))
    await waitFor(() => expect(screen.queryByText('Salario', { selector: 'td' })).toBeNull())
    expect(screen.getByText('Comida', { selector: 'td' })).toBeInTheDocument()
    const pills = document.getElementById('tx-filter-pills') as HTMLElement
    expect(pills.textContent).toContain('Gastos')
    expect(document.getElementById('filter-toggle-btn')?.className).toContain('has-filters')
    expect(screen.getByText('Te quedó con estos filtros')).toBeInTheDocument()
    await user.click(within(pills).getByRole('button', { name: 'Quitar filtro' }))
    await waitFor(() => expect(f.callsTo('GET', URL_BASE).length).toBeGreaterThan(1))
    expect(await screen.findByText('Salario', { selector: 'td' })).toBeInTheDocument()
  })

  it('manda mes y cat elegidos a las opciones devueltas por el backend', async () => {
    const f = mockFetch({
      'GET /api/tx': (c: { url: string }) => {
        const m = /mes=([^&]*)&cat=(.*)$/.exec(c.url)
        return listado({ filtros: { tipo: '', mes: m?.[1] ?? '', cat: decodeURIComponent(m?.[2] ?? '') } })
      },
    })
    const user = userEvent.setup()
    ui()
    await screen.findByText('Abril - 2026')
    await user.click(document.getElementById('f-mes-filter') as HTMLElement)
    await user.click(screen.getByRole('option', { name: 'marzo de 2026' }))
    await waitFor(() => expect(f.callsTo('GET', '/api/tx?col=fecha&dir=-1&tipo=&mes=2026-03&cat=')).toHaveLength(1))
    await user.click(document.getElementById('f-cat-filter') as HTMLElement)
    await user.click(screen.getByRole('option', { name: 'Comida' }))
    await waitFor(() => expect(f.callsTo('GET', '/api/tx?col=fecha&dir=-1&tipo=&mes=2026-03&cat=Comida')).toHaveLength(1))
  })

  it('row keyboard opens the edit form', async () => {
    mockFetch()
    const user = userEvent.setup()
    ui()
    const row = await screen.findByRole('button', { name: 'Editar Mercado' })
    expect(row.getAttribute('tabindex')).toBe('0')
    row.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Editar movimiento')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })
})

describe('filtros obsoletos', () => {
  it('si el backend normaliza el filtro, la UI se resetea al valor devuelto', async () => {
    const f = mockFetch({
      'GET /api/tx': (c: { url: string }) => (c.url.includes('mes=2026-03') ? listado({ filtros: { tipo: '', mes: '', cat: '' } }) : listado()),
    })
    const user = userEvent.setup()
    ui()
    await screen.findByText('Abril - 2026')
    await user.click(document.getElementById('f-mes-filter') as HTMLElement)
    await user.click(screen.getByRole('option', { name: 'marzo de 2026' }))
    await waitFor(() => expect(f.callsTo('GET', '/api/tx?col=fecha&dir=-1&tipo=&mes=2026-03&cat=').length).toBeGreaterThan(0))
    await waitFor(() => expect(document.getElementById('f-mes-filter')).toHaveTextContent('Todos los meses'))
    expect(document.querySelector('.filter-pill')).toBeNull()
  })
})

describe('fila y columnas desde el backend', () => {
  const transfer = { ...mercado, id: 3, tipo: 'transfer' as const, categoria: 'Pago deuda', descripcion: '', editable: false, tono: 'neutro', icono_metodo: 'efectivo', tarjeta_id: null, tarjeta_franquicia: null, grupo: 'Marzo - 2026' }

  it('editable decide si la fila es un botón; tono pinta el monto; icono_metodo elige el asset', async () => {
    mockFetch({ 'GET /api/tx': listado({ items: [salario, mercado, transfer] }) })
    ui()
    await screen.findByText('Abril - 2026'.replace('Abril', 'Marzo'))
    expect(screen.getByRole('button', { name: 'Editar Mercado' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar Pago deuda' })).toBeNull()
    const montos = [...document.querySelectorAll('td[data-label="Monto"] span')]
    expect(montos.map((m) => m.className)).toEqual(['text-inversiones-text', 'text-foreground', 'text-muted-foreground'])
    const iconos = [...document.querySelectorAll('td[data-label="Método de pago"] img')].map((i) => i.getAttribute('src'))
    expect(iconos).toEqual(['/assets/icons/efectivo.svg', '/assets/franquicias/visa.svg', '/assets/icons/efectivo.svg'])
  })

  it('una icono_metodo desconocido cae a la franquicia Otra', async () => {
    mockFetch({ 'GET /api/tx': listado({ items: [{ ...mercado, icono_metodo: 'Diners' }] }) })
    ui()
    await screen.findByText('Mercado')
    expect(document.querySelector('td[data-label="Método de pago"] img')).toHaveAttribute('src', '/assets/franquicias/otra.svg')
  })

  it('los th salen de meta: scope col, ordenables con foco y aria-sort, el resto inertes', async () => {
    const f = mockFetch()
    const user = userEvent.setup()
    ui()
    await screen.findByText('Abril - 2026')
    const heads = [...document.querySelectorAll('thead th')]
    expect(heads.map((h) => h.getAttribute('data-col'))).toEqual(['fecha', 'tipo', 'categoria', 'descripcion', 'monto', 'metodo_pago'])
    heads.forEach((h) => expect(h).toHaveAttribute('scope', 'col'))
    heads.forEach((h) => expect(h.hasAttribute('role')).toBe(false))
    const metodo = screen.getByRole('columnheader', { name: 'Método de pago' })
    expect(metodo.hasAttribute('tabindex')).toBe(false)
    expect(metodo.hasAttribute('aria-sort')).toBe(false)
    await user.click(metodo)
    expect(f.callsTo('GET', '/api/tx?col=metodo_pago&dir=1&tipo=&mes=&cat=')).toHaveLength(0)
    expect(screen.getByRole('columnheader', { name: 'Tipo' })).toHaveClass('hidden', 'sm:table-cell')
    expect(metodo).not.toHaveClass('hidden')
    expect(document.querySelector('table caption')).toHaveTextContent('Movimientos')
  })
})
