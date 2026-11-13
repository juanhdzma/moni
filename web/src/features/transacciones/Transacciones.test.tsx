import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deuda, estado, tx } from '../../test/factories'
import { failure, mockFetch } from '../../test/mockFetch'
import { renderWithProviders } from '../../test/render'
import { expectLabels, modalBody } from '../../test/labels'
import { useData } from '../../shell/DataProvider'
import { Transacciones, openTxForm } from '.'

const datos = () =>
  estado({
    deudas: [deuda({ _id: 5, nombre: 'Visa Oro', es_tarjeta: 1, franquicia: 'Visa' })],
    transacciones: [
      tx('gasto', 'Comida', 5000, { _id: 1, fecha: '2026-03-10T10:00', descripcion: 'Mercado', tarjeta_id: 5 }),
      tx('ingreso', 'Salario', 900000, { _id: 2, fecha: '2026-04-02T08:00' }),
      tx('transfer', 'Pago deuda', 100, { _id: 3, fecha: '2026-04-03T08:00' }),
    ],
  })

const ui = (e = datos()) => {
  const r = renderWithProviders(<Transacciones active />, { estado: e })
  return r
}

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 5, 15, 10, 30) }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Transacciones tab', () => {
  it('renders rows without transfers, with groups, sign and card chip', () => {
    mockFetch()
    ui()
    expect(screen.queryByText('Auto')).toBeNull()
    expect(screen.getByText('Abril - 2026')).toBeTruthy()
    expect(screen.getByText('+' + '$ 900.000'.replace('$ ', '$'))).toBeTruthy()
    expect(screen.getAllByText('Visa Oro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Efectivo / Débito').length).toBeGreaterThan(0)
    expect(document.querySelector('img[src="assets/franquicias/visa.svg"]')).toBeTruthy()
  })

  it('shows the loading row until the first load finishes', () => {
    mockFetch()
    renderWithProviders(<Transacciones active />, { loaded: false })
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
    expect(screen.queryByText('Sin movimientos')).toBeNull()
  })

  it('shows empty state', () => {
    mockFetch()
    ui(estado())
    expect(screen.getByText('Sin movimientos')).toBeTruthy()
  })

  it('sorts by header with click and keyboard, updating aria-sort', async () => {
    mockFetch()
    const user = userEvent.setup()
    ui()
    const fecha = screen.getByRole('columnheader', { name: 'Fecha' })
    expect(fecha.getAttribute('aria-sort')).toBe('descending')
    const monto = screen.getByRole('columnheader', { name: 'Monto' })
    await user.click(monto)
    expect(monto.getAttribute('aria-sort')).toBe('descending')
    expect(monto.className).toContain('active desc')
    expect(fecha.getAttribute('aria-sort')).toBe('none')
    expect(document.querySelector('.tx-group-row')).toBeNull()
    monto.focus()
    await user.keyboard('{Enter}')
    expect(monto.getAttribute('aria-sort')).toBe('ascending')
    await user.keyboard(' ')
    expect(monto.getAttribute('aria-sort')).toBe('descending')
    const montos = [...document.querySelectorAll('td[data-label="Monto"]')].map((c) => c.textContent)
    expect(montos[0]).toContain('900.000')
  })

  it('filters by tipo and shows removable pill', async () => {
    mockFetch()
    const user = userEvent.setup()
    ui()
    await user.click(screen.getByRole('button', { name: 'Filtros' }))
    expect(screen.getByRole('button', { name: 'Filtros' }).getAttribute('aria-expanded')).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Tipo' }))
    await user.click(screen.getByRole('option', { name: 'Gastos' }))
    expect(screen.queryByText('Salario', { selector: 'td' })).toBeNull()
    expect(screen.getByText('Comida', { selector: 'td' })).toBeTruthy()
    const pills = document.getElementById('tx-filter-pills') as HTMLElement
    expect(pills.textContent).toContain('Gastos')
    expect(document.getElementById('filter-toggle-btn')?.className).toContain('has-filters')
    expect(screen.getByText(/1 movimiento con estos filtros/)).toBeTruthy()
    await user.click(within(pills).getByRole('button', { name: 'Quitar filtro' }))
    expect(screen.getByText('Salario', { selector: 'td' })).toBeTruthy()
  })

  it('row keyboard opens the edit form', async () => {
    mockFetch()
    const user = userEvent.setup()
    ui()
    const row = screen.getByRole('button', { name: 'Editar Mercado' })
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
    await user.click(screen.getByRole('button', { name: /Editar/ }))
    return user
  }

  it('conserva la categoría que ya no está en la lista', async () => {
    const f = mockFetch({ 'PUT /api/tx/9': { ok: true } })
    const user = await editar(tx('gasto', 'Categoría vieja', 100, { _id: 9, id: 9, fecha: '2026-03-10T10:00', descripcion: 'x' }))
    expect(document.getElementById('m-cat')).toHaveTextContent('Categoría vieja')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ categoria: 'Categoría vieja', monto: 100 })
  })

  it('una fecha sin hora abre con T00:00 y guarda', async () => {
    const f = mockFetch({ 'PUT /api/tx/9': { ok: true } })
    const user = await editar(tx('gasto', 'Comida', 100, { _id: 9, id: 9, fecha: '2026-03-10', descripcion: 'x' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ fecha: '2026-03-10T00:00' })
  })
})

describe('filtros obsoletos', () => {
  const fila = (t: string) => within(document.getElementById('tx-tbody') as HTMLElement).queryAllByText(t)[0] ?? null

  function Recargar() {
    const { reload } = useData()
    return <button onClick={() => void reload()}>recargar</button>
  }

  it('si la opción elegida desaparece el filtro se resetea para siempre', async () => {
    const abril = tx('ingreso', 'Salario', 900000, { id: 2, _id: 2, fecha: '2026-04-02T08:00' })
    const marzo = tx('gasto', 'Comida', 5000, { id: 1, _id: 1, fecha: '2026-03-10T10:00', descripcion: 'Mercado' })
    const todo = (transacciones: unknown[]) => ({ transacciones, deudas: [], inversiones: [], activos: [], recurrentes: [] })
    const f = mockFetch()
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <Transacciones active />
        <Recargar />
      </>,
      { estado: estado({ transacciones: [marzo, abril] }) },
    )
    await user.click(document.getElementById('f-mes-filter') as HTMLElement)
    await user.click(screen.getByRole('option', { name: /marzo/i }))
    expect(fila('Salario')).toBeNull()

    f.set('GET /api/all', todo([abril]))
    await user.click(screen.getByText('recargar'))
    await waitFor(() => expect(fila('Salario')).toBeInTheDocument())
    expect(document.getElementById('f-mes-filter')).toHaveTextContent('Todos los meses')

    f.set('GET /api/all', todo([marzo, abril]))
    await user.click(screen.getByText('recargar'))
    await waitFor(() => expect(fila('Mercado')).toBeInTheDocument())
    expect(fila('Salario')).toBeInTheDocument()
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

  it('adds a custom category and selects it', async () => {
    const user = await abrirNuevo()
    await user.click(screen.getByTitle('Agregar categoría'))
    await user.type(document.getElementById('new-cat-name') as HTMLElement, 'Mascotas{Enter}')
    expect(document.getElementById('new-cat-wrap')).toBeNull()
    expect(document.querySelector('#m-cat .cdd-label')?.textContent).toBe('Mascotas')
    localStorage.clear()
  })

  it('edit sends PUT without _id and delete confirms then sends DELETE', async () => {
    const f = mockFetch({ 'PUT /api/tx/1': { ok: true } })
    const user = userEvent.setup()
    ui()
    await user.click(screen.getByRole('button', { name: 'Editar Mercado' }))
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
    await user.click(screen.getByRole('button', { name: 'Editar Mercado' }))
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
    await user.click(screen.getByRole('button', { name: 'Editar Mercado' }))
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
