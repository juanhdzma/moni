import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { estado, recurrente } from '../../test/factories'
import { mockFetch } from '../../test/mockFetch'
import { renderWithProviders } from '../../test/render'
import { useOpenerCtx } from '../../shell/openers'
import { useData } from '../../shell/DataProvider'
import { Recurrentes, openRecurrenteMaterializeFormById } from '.'

const H = { 'X-Moni-Request': '1' }

const items = [
  recurrente({ _id: 1, id: 1, nombre: 'Salario', tipo: 'ingreso', monto: 1000000, frecuencia: 'mensual', fecha_inicio: '2026-08-15' }),
  recurrente({ _id: 2, id: 2, nombre: 'Netflix', tipo: 'gasto', monto: 30000, frecuencia: 'mensual', fecha_inicio: '2026-08-20', notas: 'plan' }),
  recurrente({ _id: 3, id: 3, nombre: 'Gym', tipo: 'gasto', monto: 120000, frecuencia: 'trimestral', activo: false, fecha_inicio: '2026-01-01' }),
]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 7, 15, 10, 0, 0))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function Banner() {
  const { banner } = useData()
  return <div data-testid="banner">{banner}</div>
}

const view = (rec = items) => renderWithProviders(<><Banner /><Recurrentes active /></>, { estado: estado({ recurrentes: rec }) })

describe('render', () => {
  it('summary counts only active items, monthly normalised', () => {
    mockFetch()
    view()
    const card = document.getElementById('rec-total') as HTMLElement
    expect(card.textContent).toContain('Ingresos/mes')
    expect(within(card).getAllByText(/\$/)[0]?.textContent).toContain('1.000.000')
    expect(card.textContent).toContain('30.000')
    expect(card.textContent).toContain('+')
    expect(card.textContent).toContain('970.000')
  })

  it('next payment relative to today, none when paused', () => {
    mockFetch()
    view()
    const ing = document.getElementById('rec-ingresos') as HTMLElement
    expect(within(ing).getByText('hoy')).toBeTruthy()
    const gas = document.getElementById('rec-gastos') as HTMLElement
    expect(within(gas).getByText('en 5d')).toBeTruthy()
    expect(gas.querySelectorAll('.rec-meta-next')).toHaveLength(1)
    expect(gas.querySelector('.rec-item.inactive')?.textContent).toContain('Gym')
    expect(gas.querySelector('.rec-item.inactive')?.textContent).toContain('Trimestral')
    expect(gas.querySelector('.rec-item.inactive .rec-amount')?.textContent).toContain('40.000')
    expect(within(gas).getByText('plan')).toBeTruthy()
  })

  it('sorts by monthly amount desc and shows empty states', () => {
    mockFetch()
    view()
    const names = [...document.querySelectorAll('#rec-gastos .rec-name')].map((e) => e.textContent)
    expect(names).toEqual(['Gym', 'Netflix'])
    document.body.innerHTML = ''
    view([])
    expect(screen.getByText('Sin ingresos recurrentes.')).toBeTruthy()
    expect(screen.getByText('Sin gastos recurrentes.')).toBeTruthy()
  })

  it('action buttons are real buttons, reachable by keyboard', async () => {
    mockFetch()
    view()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const btn = screen.getAllByTitle('Pausar')[0] as HTMLElement
    expect(btn.tagName).toBe('BUTTON')
    await user.tab()
    expect(document.activeElement?.tagName).toBe('BUTTON')
    await user.click(screen.getAllByText('Editar')[0] as HTMLElement)
    expect(screen.getByText('Editar recurrente')).toBeTruthy()
  })
})

describe('toggle', () => {
  it('PUTs the whole item with activo flipped and no _id', async () => {
    const f = mockFetch({ 'PUT /api/rec/2': {} })
    view()
    await userEvent.click(screen.getAllByTitle('Pausar')[1] as HTMLElement)
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'PUT',
      url: '/api/rec/2',
      headers: H,
      body: { id: 2, nombre: 'Netflix', tipo: 'gasto', monto: 30000, frecuencia: 'mensual', activo: false, fecha_inicio: '2026-08-20', notas: 'plan' },
    })
    expect(f.mutations()[0]?.body).not.toHaveProperty('_id')
  })

  it('activating a paused item sends activo true', async () => {
    const f = mockFetch({ 'PUT /api/rec/3': {} })
    view()
    await userEvent.click(screen.getByTitle('Activar'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ activo: true })
  })

  it('failure shows the banner and refetches', async () => {
    const f = mockFetch({ 'PUT /api/rec/2': new Response(JSON.stringify({ detail: 'boom' }), { status: 500 }) })
    view()
    await userEvent.click(screen.getAllByTitle('Pausar')[1] as HTMLElement)
    await waitFor(() => expect(f.callsTo('GET', '/api/all').length).toBeGreaterThan(0))
    await waitFor(() => expect(screen.getByTestId('banner').textContent).toContain('boom'))
  })
})

describe('create / edit / delete', () => {
  it('create posts the payload', async () => {
    const f = mockFetch({ 'POST /api/rec': {} })
    view()
    await userEvent.click(screen.getByText('+ Nuevo'))
    expect(screen.getByText('Nuevo recurrente')).toBeTruthy()
    expect(document.querySelector('.tipo-btn.sel')).toBe(document.getElementById('rt-gasto'))
    await userEvent.click(screen.getByText('Agregar'))
    expect(document.getElementById('m-status')?.textContent).toBe('Nombre requerido')
    await userEvent.type(screen.getByPlaceholderText('Ej. Netflix'), '  Spotify ')
    await userEvent.click(screen.getByText('Agregar'))
    expect(document.getElementById('m-status')?.textContent).toBe('Monto requerido')
    await userEvent.type(document.getElementById('m-monto') as HTMLElement, '25000')
    await userEvent.click(screen.getByText('Agregar'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST',
      url: '/api/rec',
      headers: H,
      body: { nombre: 'Spotify', tipo: 'gasto', monto: 25000, frecuencia: 'mensual', activo: true, fecha_inicio: '', notas: '' },
    })
  })

  it('tipo toggle switches to ingreso', async () => {
    const f = mockFetch({ 'POST /api/rec': {} })
    view()
    await userEvent.click(screen.getByText('+ Nuevo'))
    await userEvent.click(screen.getByText('Ingreso'))
    expect(document.getElementById('rt-ingreso')?.className).toContain('sel')
    await userEvent.type(screen.getByPlaceholderText('Ej. Netflix'), 'Pago')
    await userEvent.type(document.getElementById('m-monto') as HTMLElement, '5000')
    await userEvent.click(screen.getByText('Agregar'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ tipo: 'ingreso', monto: 5000 })
  })

  it('edit keeps the current activo and PUTs without _id', async () => {
    const f = mockFetch({ 'PUT /api/rec/3': {} })
    view()
    const row = screen.getByText('Gym').closest('.rec-item') as HTMLElement
    await userEvent.click(within(row).getByText('Editar'))
    expect(screen.getByText('Editar recurrente')).toBeTruthy()
    expect((screen.getByPlaceholderText<HTMLInputElement>('Ej. Netflix')).value).toBe('Gym')
    expect((document.getElementById('m-monto') as HTMLInputElement).value).toBe('120.000')
    await userEvent.click(screen.getByText('Guardar cambios'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'PUT',
      url: '/api/rec/3',
      headers: H,
      body: { nombre: 'Gym', tipo: 'gasto', monto: 120000, frecuencia: 'trimestral', activo: false, fecha_inicio: '2026-01-01', notas: '' },
    })
    expect(f.mutations()[0]?.body).not.toHaveProperty('_id')
  })

  it('save error shows inline', async () => {
    mockFetch({ 'POST /api/rec': new Response(JSON.stringify({ detail: 'malo' }), { status: 422 }) })
    view()
    await userEvent.click(screen.getByText('+ Nuevo'))
    await userEvent.type(screen.getByPlaceholderText('Ej. Netflix'), 'X')
    await userEvent.type(document.getElementById('m-monto') as HTMLElement, '10')
    await userEvent.click(screen.getByText('Agregar'))
    await waitFor(() => expect(document.getElementById('m-status')?.textContent).toBe('❌ malo'))
    expect(document.getElementById('m-status')?.className).toContain('err')
  })

  it('delete asks for confirmation then DELETEs', async () => {
    const f = mockFetch({ 'DELETE /api/rec/2': null })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    view()
    const row = screen.getByText('Netflix').closest('.rec-item') as HTMLElement
    await userEvent.click(within(row).getByText('Editar'))
    await userEvent.click(screen.getByText('Eliminar'))
    expect(confirmSpy).toHaveBeenCalledWith('¿Eliminar "Netflix"?')
    expect(f.mutations()).toHaveLength(0)
    await userEvent.click(screen.getByText('Eliminar'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'DELETE', url: '/api/rec/2', headers: H })
  })

  it('delete failure shows banner', async () => {
    mockFetch({ 'DELETE /api/rec/2': new Response(JSON.stringify({ detail: 'no' }), { status: 500 }) })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    view()
    const row = screen.getByText('Netflix').closest('.rec-item') as HTMLElement
    await userEvent.click(within(row).getByText('Editar'))
    await userEvent.click(screen.getByText('Eliminar'))
    await waitFor(() => expect(screen.getByTestId('banner').textContent).toContain('no'))
  })
})

describe('materialize', () => {
  function Harness({ id }: { id: number }) {
    const ctx = useOpenerCtx()
    return <button onClick={() => openRecurrenteMaterializeFormById(ctx, id, '2026-08-20')}>open</button>
  }

  it('posts a tx with the prefilled values', async () => {
    const f = mockFetch({ 'POST /api/tx': {} })
    renderWithProviders(<Harness id={2} />, { estado: estado({ recurrentes: items }) })
    act(() => screen.getByText('open').click())
    expect(screen.getByText('Registrar · Netflix')).toBeTruthy()
    expect((document.getElementById('m-desc') as HTMLInputElement).value).toBe('Netflix')
    expect((document.getElementById('m-monto') as HTMLInputElement).value).toBe('30.000')
    await userEvent.click(screen.getByText('Registrar'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST',
      url: '/api/tx',
      headers: H,
      body: { fecha: '2026-08-20T00:00', tipo: 'gasto', descripcion: 'Netflix', monto: 30000, notas: '' },
    })
  })

  it('validates amount and shows server errors inline', async () => {
    mockFetch({ 'POST /api/tx': new Response(JSON.stringify({ detail: 'x' }), { status: 422 }) })
    renderWithProviders(<Harness id={1} />, { estado: estado({ recurrentes: items }) })
    act(() => screen.getByText('open').click())
    await userEvent.clear(document.getElementById('m-monto') as HTMLElement)
    await userEvent.click(screen.getByText('Registrar'))
    expect(document.getElementById('m-status')?.textContent).toBe('Ingresá un monto válido')
    await userEvent.type(document.getElementById('m-monto') as HTMLElement, '5')
    await userEvent.click(screen.getByText('Registrar'))
    await waitFor(() => expect(document.getElementById('m-status')?.textContent).toBe('❌ x'))
  })

  it('unknown id opens nothing', () => {
    mockFetch()
    renderWithProviders(<Harness id={99} />, { estado: estado({ recurrentes: items }) })
    act(() => screen.getByText('open').click())
    expect(document.getElementById('m-desc')).toBeNull()
  })
})
