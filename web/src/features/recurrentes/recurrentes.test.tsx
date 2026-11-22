import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResumenRecurrentes } from '../../types'
import { estado, recurrente } from '../../test/factories'
import { mockFetch } from '../../test/mockFetch'
import { renderWithProviders } from '../../test/render'
import { expectLabels, modalBody } from '../../test/labels'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { useData } from '@/shell/providers/DataProvider'
import { Recurrentes, openRecurrenteMaterializeFormById } from '.'

const H = { 'X-Moni-Request': '1' }

const salario = recurrente({ _id: 1, id: 1, nombre: 'Salario', tipo: 'ingreso', monto: 1000000, frecuencia: 'mensual', fecha_inicio: '2026-08-15', mensual: 1000000, proximo_pago: { fecha: '2026-08-15', dias: 0, texto: 'hoy' } })
const netflix = recurrente({ _id: 2, id: 2, nombre: 'Netflix', tipo: 'gasto', monto: 30000, frecuencia: 'mensual', fecha_inicio: '2026-08-20', notas: 'plan', mensual: 30000, proximo_pago: { fecha: '2026-08-20', dias: 5, texto: 'en 5d' } })
const gym = recurrente({ _id: 3, id: 3, nombre: 'Gym', tipo: 'gasto', monto: 120000, frecuencia: 'trimestral', frecuencia_label: 'Trimestral', activo: false, fecha_inicio: '2026-01-01', mensual: 40000, proximo_pago: null })
const items = [salario, netflix, gym]

const resumen = (extra: Partial<ResumenRecurrentes> = {}): ResumenRecurrentes => ({
  total_gastos_mensual: 30000,
  total_ingresos_mensual: 1000000,
  neto_mensual: 970000,
  segmentos: [{ key: '2', label: 'Netflix', valor: 30000 }],
  ingresos: [salario],
  gastos: [gym, netflix],
  ...extra,
})

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

const view = (rec = items, res: ResumenRecurrentes = resumen(), routes: Parameters<typeof mockFetch>[0] = {}) => {
  const f = mockFetch({ 'GET /api/rec/resumen': res as unknown as Record<string, unknown>, ...routes })
  renderWithProviders(<><Banner /><Recurrentes active /></>, { estado: estado({ recurrentes: rec }) })
  return f
}

describe('render', () => {
  it('fetches the summary and shows the backend totals', async () => {
    const f = view()
    const card = document.getElementById('rec-total') as HTMLElement
    await waitFor(() => expect(card.textContent).toContain('970.000'))
    expect(f.callsTo('GET', '/api/rec/resumen').length).toBeGreaterThan(0)
    expect(card.textContent).toContain('Neto mensual')
    expect(card.textContent).toContain('+')
    expect(card.textContent).toContain('1.000.000')
    expect(card.textContent).toContain('30.000')
  })

  it('header shows a negative net and the fixed costs in the legend', async () => {
    view([], resumen({ neto_mensual: -50000, total_ingresos_mensual: 0, total_gastos_mensual: 50000, segmentos: [{ key: '9', label: 'Arriendo', valor: 50000 }], ingresos: [], gastos: [] }))
    const card = document.getElementById('rec-total') as HTMLElement
    await waitFor(() => expect(card.textContent).toContain('−$50.000'))
    expect(within(card).getByRole('list', { name: 'De qué está hecho' })).toHaveTextContent('Arriendo')
  })

  it('renders the next payment text and the monthly amount from the backend', async () => {
    view()
    const ing = document.getElementById('rec-ingresos') as HTMLElement
    await waitFor(() => expect(within(ing).getByText('hoy')).toBeTruthy())
    const gas = document.getElementById('rec-gastos') as HTMLElement
    expect(within(gas).getByText('en 5d')).toBeTruthy()
    expect(gas.querySelectorAll('[data-rec-next]')).toHaveLength(1)
    expect(gas.querySelector('[data-rec][data-inactive]')?.textContent).toContain('Gym')
    expect(gas.querySelector('[data-rec][data-inactive]')?.textContent).toContain('Trimestral')
    expect(gas.querySelector('[data-rec][data-inactive] [data-rec-amount]')?.textContent).toContain('40.000')
    expect(within(gas).getByText('plan')).toBeTruthy()
  })

  it('keeps the backend order and shows empty states', async () => {
    view()
    await waitFor(() => expect(document.querySelectorAll('#rec-gastos [data-rec-name]')).toHaveLength(2))
    const names = [...document.querySelectorAll('#rec-gastos [data-rec-name]')].map((e) => e.textContent)
    expect(names).toEqual(['Gym', 'Netflix'])
    document.body.innerHTML = ''
    view([], resumen({ ingresos: [], gastos: [] }))
    expect(await screen.findByText('Sin ingresos recurrentes.')).toBeTruthy()
    expect(screen.getByText('Sin gastos recurrentes.')).toBeTruthy()
  })

  it('action buttons are real buttons, reachable by keyboard', async () => {
    view()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const btn = (await screen.findAllByTitle('Pausar'))[0] as HTMLElement
    expect(btn.tagName).toBe('BUTTON')
    await user.tab()
    expect(document.activeElement?.tagName).toBe('BUTTON')
    await user.click(screen.getAllByText('Editar')[0] as HTMLElement)
    expect(screen.getByText('Editar recurrente')).toBeTruthy()
  })
})

describe('toggle', () => {
  it('PUTs the whole item with activo flipped and no _id', async () => {
    const f = view(items, resumen(), { 'PUT /api/rec/2': {} })
    await userEvent.click((await screen.findAllByTitle('Pausar'))[1] as HTMLElement)
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'PUT',
      url: '/api/rec/2',
      headers: H,
      body: { nombre: 'Netflix', tipo: 'gasto', monto: 30000, frecuencia: 'mensual', activo: false, fecha_inicio: '2026-08-20', notas: 'plan' },
    })
    expect(f.mutations()[0]?.body).not.toHaveProperty('_id')
    expect(f.mutations()[0]?.body).not.toHaveProperty('mensual')
    expect(f.mutations()[0]?.body).not.toHaveProperty('proximo_pago')
  })

  it('activating a paused item sends activo true', async () => {
    const f = view(items, resumen(), { 'PUT /api/rec/3': {} })
    await userEvent.click(await screen.findByTitle('Activar'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ activo: true })
  })

  it('failure shows the banner and refetches', async () => {
    const f = view(items, resumen(), { 'PUT /api/rec/2': new Response(JSON.stringify({ detail: 'boom' }), { status: 500 }) })
    await userEvent.click((await screen.findAllByTitle('Pausar'))[1] as HTMLElement)
    await waitFor(() => expect(f.callsTo('GET', '/api/all').length).toBeGreaterThan(0))
    await waitFor(() => expect(screen.getByTestId('banner').textContent).toContain('boom'))
  })
})

describe('create / edit / delete', () => {
  it('create posts the payload', async () => {
    const f = view(items, resumen(), { 'POST /api/rec': {} })
    await userEvent.click(screen.getByText('Nuevo'))
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
    const f = view(items, resumen(), { 'POST /api/rec': {} })
    await userEvent.click(screen.getByText('Nuevo'))
    await userEvent.click(screen.getByText('Ingreso'))
    expect(document.getElementById('rt-ingreso')?.className).toContain('sel')
    await userEvent.type(screen.getByPlaceholderText('Ej. Netflix'), 'Pago')
    await userEvent.type(document.getElementById('m-monto') as HTMLElement, '5000')
    await userEvent.click(screen.getByText('Agregar'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ tipo: 'ingreso', monto: 5000 })
  })

  it('edit keeps the current activo and PUTs without _id', async () => {
    const f = view(items, resumen(), { 'PUT /api/rec/3': {} })
    const row = (await screen.findByText('Gym')).closest('[data-rec]') as HTMLElement
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
    view(items, resumen(), { 'POST /api/rec': new Response(JSON.stringify({ detail: 'malo' }), { status: 422 }) })
    await userEvent.click(screen.getByText('Nuevo'))
    await userEvent.type(screen.getByPlaceholderText('Ej. Netflix'), 'X')
    await userEvent.type(document.getElementById('m-monto') as HTMLElement, '10')
    await userEvent.click(screen.getByText('Agregar'))
    await waitFor(() => expect(document.getElementById('m-status')?.textContent).toBe('malo'))
    expect(document.getElementById('m-status')?.className).toContain('err')
  })

  it('delete asks for confirmation then DELETEs', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const f = view(items, resumen(), { 'DELETE /api/rec/2': null })
    const row = (await within(document.getElementById('rec-gastos') as HTMLElement).findByText('Netflix')).closest('[data-rec]') as HTMLElement
    await userEvent.click(within(row).getByText('Editar'))
    await userEvent.click(screen.getByText('Eliminar'))
    expect(confirmSpy).toHaveBeenCalledWith('¿Eliminar "Netflix"?')
    expect(f.mutations()).toHaveLength(0)
    await userEvent.click(screen.getByText('Eliminar'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'DELETE', url: '/api/rec/2', headers: H })
  })

  it('delete failure shows banner', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    view(items, resumen(), { 'DELETE /api/rec/2': new Response(JSON.stringify({ detail: 'no' }), { status: 500 }) })
    const row = (await within(document.getElementById('rec-gastos') as HTMLElement).findByText('Netflix')).closest('[data-rec]') as HTMLElement
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
    await waitFor(() => expect(document.getElementById('m-status')?.textContent).toBe('x'))
  })

  it('unknown id opens nothing', () => {
    mockFetch()
    renderWithProviders(<Harness id={99} />, { estado: estado({ recurrentes: items }) })
    act(() => screen.getByText('open').click())
    expect(document.getElementById('m-desc')).toBeNull()
  })
})

describe('labels', () => {
  it('el form de recurrente se encuentra por sus labels', async () => {
    mockFetch()
    renderWithProviders(<Recurrentes active />, { estado: estado({ recurrentes: items }) })
    await userEvent.click(screen.getByText('Nuevo'))
    expectLabels(modalBody(), {
      Nombre: 'm-nombre',
      'Monto (COP)': 'm-monto',
      Frecuencia: 'm-frecuencia',
      'Fecha inicio (opcional)': 'm-fecha',
      'Notas (opcional)': 'm-notas',
    })
    expect(within(modalBody()).getByRole('group', { name: 'Tipo' })).toBeInTheDocument()
  })
})
