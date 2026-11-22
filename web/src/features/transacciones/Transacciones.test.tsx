import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiAll, categoriasBase, deuda, estado, tx } from '../../test/factories'
import { failure, mockFetch as base } from '../../test/mockFetch'
import { renderWithProviders } from '../../test/render'
import { expectLabels, modalBody } from '../../test/labels'
import type { ListadoTx } from '../../types'
import { Transacciones, openTxForm } from '.'

const datos = () =>
  estado({
    deudas: [deuda({ _id: 5, nombre: 'Visa Oro', es_tarjeta: 1, franquicia: 'Visa' })],
    transacciones: [
      tx('gasto', 'Comida', 5000, { _id: 1, id: 1, fecha: '2026-03-10T10:00', descripcion: 'Mercado', tarjeta_id: 5 }),
      tx('ingreso', 'Salario', 900000, { _id: 2, id: 2, fecha: '2026-04-02T08:00' }),
      tx('transfer', 'Pago deuda', 100, { _id: 3, id: 3, fecha: '2026-04-03T08:00' }),
    ],
  })

const mercado: ListadoTx['items'][number] = {
  id: 1,
  fecha: '2026-03-10T10:00',
  tipo: 'gasto',
  categoria: 'Comida',
  descripcion: 'Mercado',
  monto: 5000,
  notas: '',
  tarjeta_id: 5,
  mes: '2026-03',
  es_gasto_cartera: false,
  metodo_pago: 'Visa Oro',
  tarjeta_nombre: 'Visa Oro',
  tarjeta_franquicia: 'Visa',
  grupo: 'Marzo - 2026',
}
const salario: ListadoTx['items'][number] = {
  id: 2,
  fecha: '2026-04-02T08:00',
  tipo: 'ingreso',
  categoria: 'Salario',
  descripcion: '',
  monto: 900000,
  notas: '',
  tarjeta_id: null,
  mes: '2026-04',
  es_gasto_cartera: false,
  metodo_pago: 'Efectivo / Débito',
  tarjeta_nombre: null,
  tarjeta_franquicia: null,
  grupo: 'Abril - 2026',
}
const opciones = {
  meses: [
    { value: '2026-04', label: 'abril de 2026' },
    { value: '2026-03', label: 'marzo de 2026' },
  ],
  categorias: ['Comida', 'Salario'],
}
const listado = (extra: Partial<ListadoTx> = {}): ListadoTx => ({
  items: [salario, mercado],
  filtros: { tipo: '', mes: '', cat: '' },
  opciones,
  pills: [],
  resumen: {
    ingresos: 900000,
    gastos: 5000,
    neto: 895000,
    segmentos: [{ key: 'Comida', label: 'Comida', valor: 5000 }],
  },
  ...extra,
})
const mockFetch = (routes: Record<string, unknown> = {}) => base({ 'GET /api/tx': listado(), ...routes })
const URL_BASE = '/api/tx?col=fecha&dir=-1&tipo=&mes=&cat='

const filaDe = (t: ReturnType<typeof tx>): ListadoTx['items'][number] => ({ ...mercado, ...t, tarjeta_franquicia: null, grupo: null })
const ui = (e = datos()) => renderWithProviders(<Transacciones active />, { estado: e })

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 5, 15, 10, 30) }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Transacciones tab', () => {
  it('pide GET /api/tx con orden y filtros por defecto y pinta lo devuelto', async () => {
    const f = mockFetch()
    ui()
    expect(await screen.findByText('Abril - 2026')).toBeTruthy()
    expect(f.callsTo('GET', URL_BASE)).toHaveLength(1)
    expect(screen.getByText('+$900.000')).toBeTruthy()
    expect(screen.getByText('Marzo - 2026')).toBeTruthy()
    expect(screen.getAllByText('Visa Oro').length).toBeGreaterThan(0)
    expect(screen.getAllByTitle('Visa Oro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Efectivo / Débito').length).toBeGreaterThan(0)
    expect(document.querySelector('img[src="assets/franquicias/visa.svg"]')).toBeTruthy()
    expect(screen.getByText('Te quedó')).toBeTruthy()
  })

  it('shows the loading row until the first load finishes', () => {
    mockFetch()
    renderWithProviders(<Transacciones active />, { loaded: false })
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
    expect(screen.queryByText('Sin movimientos')).toBeNull()
  })

  it('shows empty state', async () => {
    mockFetch({ 'GET /api/tx': listado({ items: [], opciones: { meses: [], categorias: [] } }) })
    ui(estado())
    expect(await screen.findByText('Sin movimientos')).toBeTruthy()
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
              resumen: { ingresos: 0, gastos: 5000, neto: -5000, segmentos: [{ key: 'Comida', label: 'Comida', valor: 5000 }] },
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
    expect(screen.getByText('Comida', { selector: 'td' })).toBeTruthy()
    const pills = document.getElementById('tx-filter-pills') as HTMLElement
    expect(pills.textContent).toContain('Gastos')
    expect(document.getElementById('filter-toggle-btn')?.className).toContain('has-filters')
    expect(screen.getByText('Te quedó con estos filtros')).toBeTruthy()
    await user.click(within(pills).getByRole('button', { name: 'Quitar filtro' }))
    await waitFor(() => expect(f.callsTo('GET', URL_BASE).length).toBeGreaterThan(1))
    expect(await screen.findByText('Salario', { selector: 'td' })).toBeTruthy()
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
    expect(await screen.findByText('Editar movimiento')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeTruthy()
  })
})

describe('tx form: edición de datos atípicos', () => {
  const editar = async (t: ReturnType<typeof tx>) => {
    const user = userEvent.setup()
    ui(estado({ transacciones: [t] }))
    await user.click(await screen.findByRole('button', { name: /Editar/ }))
    return user
  }

  it('conserva la categoría que ya no está en la lista', async () => {
    const t = tx('gasto', 'Categoría vieja', 100, { _id: 9, id: 9, fecha: '2026-03-10T10:00', descripcion: 'x' })
    const f = mockFetch({ 'PUT /api/tx/9': { ok: true }, 'GET /api/tx': listado({ items: [filaDe(t)] }) })
    const user = await editar(t)
    expect(document.getElementById('m-cat')).toHaveTextContent('Categoría vieja')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ categoria: 'Categoría vieja', monto: 100 })
  })

  it('una fecha sin hora abre con T00:00 y guarda', async () => {
    const t = tx('gasto', 'Comida', 100, { _id: 9, id: 9, fecha: '2026-03-10', descripcion: 'x' })
    const f = mockFetch({ 'PUT /api/tx/9': { ok: true }, 'GET /api/tx': listado({ items: [filaDe(t)] }) })
    const user = await editar(t)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ fecha: '2026-03-10T00:00' })
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

describe('tx form', () => {
  const abrirNuevo = async (e = datos()) => {
    const user = userEvent.setup()
    ui(e)
    await user.click(screen.getByRole('button', { name: 'Nuevo movimiento' }))
    return user
  }

  it('creates a gasto with card: exact request', async () => {
    const f = mockFetch({ 'POST /api/tx': { ok: true } })
    const user = await abrirNuevo()
    await user.click(screen.getByRole('button', { name: 'Gasto' }))
    await user.click(screen.getByRole('button', { name: 'Gasto' }))
    await user.click(document.querySelector('#m-cat') as HTMLElement)
    await user.click(screen.getByRole('option', { name: 'Inversión' }))
    await user.type(document.getElementById('m-desc') as HTMLElement, '  Algo  ')
    await user.type(document.getElementById('m-monto') as HTMLElement, '12500')
    await user.click(document.querySelector('#m-tarjeta') as HTMLElement)
    await user.click(screen.getByRole('option', { name: 'Visa Oro' }))
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST',
      url: '/api/tx',
      headers: { 'X-Moni-Request': '1' },
      body: { tipo: 'gasto', categoria: 'Inversión', descripcion: 'Algo', monto: 12500, notas: '', tarjeta_id: 5 },
    })
    const body = f.mutations()[0]?.body as { fecha: string }
    expect(body.fecha).toBe('2026-06-15T10:30')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Agregar' })).toBeNull())
  })

  it('ingreso sends tarjeta_id null', async () => {
    const f = mockFetch({ 'POST /api/tx': { ok: true } })
    const user = await abrirNuevo()
    await user.click(screen.getByRole('button', { name: 'Ingreso' }))
    expect(document.getElementById('wrap-tarjeta')).toBeNull()
    await user.type(document.getElementById('m-monto') as HTMLElement, '1000')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ tipo: 'ingreso', categoria: 'Crédito recibido', tarjeta_id: null, monto: 1000 })
  })

  it('validates monto and shows status', async () => {
    const f = mockFetch()
    const user = await abrirNuevo()
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(document.getElementById('m-status')?.textContent).toBe('Ingresá un monto válido')
    expect(document.getElementById('m-status')?.className).toContain('err')
    expect(f.mutations()).toHaveLength(0)
  })

  it('adds a custom category: POST /api/categorias then selects it', async () => {
    const conMascotas = { ...categoriasBase(), gasto: [...categoriasBase().gasto, { nombre: 'Mascotas', sistema: false }] }
    const f = mockFetch({
      'POST /api/categorias': conMascotas,
      'GET /api/all': apiAll({ ...datos(), categorias: conMascotas }),
    })
    const user = await abrirNuevo()
    await user.click(screen.getByTitle('Agregar categoría'))
    await user.type(document.getElementById('new-cat-name') as HTMLElement, 'Mascotas{Enter}')
    await waitFor(() => expect(document.querySelector('#m-cat .cdd-label')?.textContent).toBe('Mascotas'))
    expect(f.mutations()[0]).toMatchObject({ method: 'POST', url: '/api/categorias', headers: { 'X-Moni-Request': '1' }, body: { tipo: 'gasto', nombre: 'Mascotas' } })
    expect(document.getElementById('new-cat-wrap')).toBeNull()
  })

  it('edit sends PUT without _id and delete confirms then sends DELETE', async () => {
    const f = mockFetch({ 'PUT /api/tx/1': { ok: true } })
    const user = userEvent.setup()
    ui()
    await user.click(await screen.findByRole('button', { name: 'Editar Mercado' }))
    await user.clear(document.getElementById('m-desc') as HTMLElement)
    await user.type(document.getElementById('m-desc') as HTMLElement, 'Nuevo')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'PUT',
      url: '/api/tx/1',
      headers: { 'X-Moni-Request': '1' },
      body: { fecha: '2026-03-10T10:00', tipo: 'gasto', categoria: 'Comida', descripcion: 'Nuevo', monto: 5000, tarjeta_id: 5 },
    })
    expect(f.mutations()[0]?.body).not.toHaveProperty('_id')
  })

  it('delete confirms then sends DELETE', async () => {
    const f = mockFetch({ 'DELETE /api/tx/1': { ok: true } })
    const user = userEvent.setup()
    ui()
    await user.click(await screen.findByRole('button', { name: 'Editar Mercado' }))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }))
    expect(confirm).toHaveBeenCalledWith('¿Eliminar este movimiento?')
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'DELETE', url: '/api/tx/1', headers: { 'X-Moni-Request': '1' } })
    confirm.mockRestore()
  })

  it('shows API error in modal status', async () => {
    mockFetch({ 'PUT /api/tx/1': failure(422, 'monto inválido') })
    const user = userEvent.setup()
    ui()
    await user.click(await screen.findByRole('button', { name: 'Editar Mercado' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(document.getElementById('m-status')?.textContent).toBe('monto inválido'))
    expect(document.getElementById('m-status')?.className).toContain('err')
    expect(screen.getByText('Editar movimiento')).toBeTruthy()
  })

  it('does not open the form for transfers', () => {
    mockFetch()
    ui()
    const ctx = { openModal: vi.fn(), setPendingProxOp: vi.fn(), estado: datos() }
    openTxForm(ctx, datos().transacciones[2])
    expect(ctx.openModal).not.toHaveBeenCalled()
  })
})

describe('labels', () => {
  it('cada campo del form se encuentra por su label', async () => {
    mockFetch()
    const user = userEvent.setup()
    renderWithProviders(<Transacciones active />, { estado: datos() })
    await user.click(screen.getByRole('button', { name: 'Nuevo movimiento' }))
    await user.click(screen.getByRole('button', { name: 'Gasto' }))
    expectLabels(modalBody(), {
      Categoría: 'm-cat',
      Descripción: 'm-desc',
      'Monto (COP)': 'm-monto',
      'Pagado con': 'm-tarjeta',
      Fecha: 'm-fecha',
      'Notas (opcional)': 'm-notas',
    })
    expect(within(modalBody()).getByRole('group', { name: 'Tipo' })).toBeInTheDocument()
  })
})
