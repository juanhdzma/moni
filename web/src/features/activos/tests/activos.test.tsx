import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { activo, estado } from '@/test/factories'
import { failure, mockFetch, previewConMonto } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { expectLabels, modalBody } from '@/test/labels'
import { Activos } from '@/features/activos'

const H = { 'X-Moni-Request': '1' }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 5, 15, 10, 30) })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  cleanup()
})

const a1 = activo({ id: 4, nombre: 'Casa', valor_inicial: 100000, valor_actual: 150000, fecha_adquisicion: '2026-01-02', cambio: 50000, cambio_pct: 50 })

const resumenDe = (activos: typeof a1[]) => ({
  total_inicial: activos.reduce((s, a) => s + a.valor_inicial, 0),
  total_actual: activos.reduce((s, a) => s + a.valor_actual, 0),
  variacion: activos.length ? 50000 : 0,
  mostrar_variacion: activos.length > 0,
  segmentos: activos.map((a) => ({ key: String(a.id), label: a.nombre, valor: a.valor_actual })),
  items: activos,
  texto_variacion: '50,0% sobre lo pagado',
  texto_conteo: `${activos.length} activo${activos.length === 1 ? '' : 's'}`,
  texto_vacio: { titulo: 'Sin activos aún', texto: 'Registrá un bien con el botón Nuevo activo.' },
})

async function setup(activos = [a1]) {
  const f = mockFetch({
    'GET /api/activos/resumen': resumenDe(activos),
    'POST /api/activo/4/valor/preview': previewConMonto('nuevo_valor', { delta: 30000, total: 80000, total_pct: 80 }),
    'POST /api/activo/4/venta/preview': previewConMonto('precio', { vs_inicial: 50000, vs_actual: 0 }),
  })
  renderWithProviders(<Activos active />, { estado: estado({ hoy: '2026-06-15', activos }) })
  await waitFor(() => expect(document.getElementById('activos-total')).toHaveTextContent(`${activos.length} activo`))
  const guardados = () => f.mutations().filter((c) => !c.url.endsWith('/preview'))
  return { f, guardados, user: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }) }
}

describe('Activos render', () => {
  it('el aviso de desactualizado usa el texto del bootstrap', async () => {
    const viejo = { ...a1, desactualizado: true }
    mockFetch({ 'GET /api/activos/resumen': resumenDe([viejo]) })
    renderWithProviders(<Activos active />, {
      estado: estado({ desactualizado: { texto: 'Sin actualizar hace más de 45 días' } }),
    })
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Sin actualizar hace más de 45 días')
  })

  it('shows empty state and totals', async () => {
    const { f } = await setup([])
    await waitFor(() => expect(f.calls.some((c) => c.url === '/api/activos/resumen')).toBe(true))
    expect(screen.getByText('Sin activos aún')).toBeInTheDocument()
    expect(screen.getByText('Registrá un bien con el botón Nuevo activo.')).toBeInTheDocument()
    expect(document.getElementById('activos-total')).toHaveTextContent('0 activos')
  })

  it('renders card figures from backend data', async () => {
    await setup()
    await waitFor(() => expect(document.getElementById('activos-total')).toHaveTextContent(/150\.000.*50,0% sobre lo pagado/))
    expect(document.getElementById('activos-total')).toHaveTextContent('1 activo')
    expect(screen.getByText('Casa', { selector: 'h3' })).toBeInTheDocument()
    expect(screen.getAllByText('+50,0%').length).toBeGreaterThan(0)
    expect(screen.getByText(/Adquirido/)).toBeInTheDocument()
    expect(screen.queryByText(/sin actualizar/)).toBeNull()
  })

  it('hides the variation text when the backend says not to show it', async () => {
    mockFetch({ 'GET /api/activos/resumen': { ...resumenDe([a1]), mostrar_variacion: false } })
    renderWithProviders(<Activos active />, { estado: estado({ hoy: '2026-06-15' }) })
    await waitFor(() => expect(document.getElementById('activos-total')).toHaveTextContent('1 activo'))
    expect(document.getElementById('activos-total')).not.toHaveTextContent('sobre lo pagado')
  })

  it('shows stale warning', async () => {
    await setup([{ ...a1, desactualizado: true }])
    expect(screen.getByText('Valor sin actualizar hace más de 1 mes')).toBeInTheDocument()
  })

  it('buttons are keyboard reachable', async () => {
    const { user } = await setup()
    screen.getByRole('button', { name: 'Nuevo activo' }).focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Nuevo activo', { selector: '#modal-title' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    screen.getByRole('button', { name: 'Vender' }).focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Vender · Casa')).toBeInTheDocument()
  })
})

describe('Activos forms', () => {
  it('creates with crear_tx true', async () => {
    const { guardados, user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Nuevo activo' }))
    await user.type(await screen.findByPlaceholderText('Ej. Apartamento Bogotá'), '  Moto ')
    await user.type(document.getElementById('m-val-ini') as HTMLInputElement, '5000000')
    await user.click(screen.getByRole('button', { name: 'Agregar activo' }))
    await waitFor(() => expect(guardados()).toHaveLength(1))
    expect(guardados()[0]?.body).not.toHaveProperty('valor_actual')
    expect(guardados()[0]?.body).not.toHaveProperty('valor_actualizado_en')
    expect(guardados()[0]).toMatchObject({
      method: 'POST', url: '/api/activo', headers: H,
      body: { nombre: 'Moto', valor_inicial: 5000000, fecha_adquisicion: '2026-06-15', crear_tx: true },
    })
  })

  it('creates with crear_tx false', async () => {
    const { guardados, user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Nuevo activo' }))
    await user.type(await screen.findByPlaceholderText('Ej. Apartamento Bogotá'), 'Moto')
    await user.type(document.getElementById('m-val-ini') as HTMLInputElement, '1000')
    await user.type(document.getElementById('m-val-act') as HTMLInputElement, '2000')
    await user.click(document.getElementById('m-es-nueva') as HTMLInputElement)
    await user.click(screen.getByRole('button', { name: 'Agregar activo' }))
    await waitFor(() => expect(guardados()).toHaveLength(1))
    expect(guardados()[0]?.body).toMatchObject({ valor_inicial: 1000, valor_actual: 2000, crear_tx: false })
  })

  it('shows the backend 422 instead of validating locally', async () => {
    const { f, guardados, user } = await setup()
    f.set('POST /api/activo', failure(422, 'Input should be greater than 0'))
    await user.click(screen.getByRole('button', { name: 'Nuevo activo' }))
    await user.click(await screen.findByRole('button', { name: 'Agregar activo' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('Input should be greater than 0'))
    expect(guardados()[0]).toMatchObject({ method: 'POST', url: '/api/activo', body: { nombre: '', valor_inicial: 0 } })
  })

  it('edit loads the row from GET /api/activo/{id} and sends only what the form holds', async () => {
    const { f, guardados, user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    expect(await screen.findByText('Valor inicial (COP)')).toBeInTheDocument()
    expect(f.callsTo('GET', '/api/activo/4')).toHaveLength(1)
    expect(document.getElementById('m-es-nueva')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(guardados()).toHaveLength(1))
    expect(guardados()[0]).toMatchObject({
      method: 'PUT', url: '/api/activo/4', headers: H,
      body: { nombre: 'Casa', valor_inicial: 100000, valor_actual: 150000, fecha_adquisicion: '2026-01-02' },
    })
    for (const k of ['crear_tx', 'id', 'valor_actualizado_en', 'cambio', 'desactualizado']) expect(guardados()[0]?.body).not.toHaveProperty(k)
  })

  it('edit with changed value sends it without stamping a date', async () => {
    const { guardados, user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    const el = await screen.findByDisplayValue<HTMLInputElement>('150.000')
    await user.clear(el)
    await user.type(el, '160000')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(guardados()).toHaveLength(1))
    expect(guardados()[0]?.body).toMatchObject({ valor_actual: 160000 })
    expect(guardados()[0]?.body).not.toHaveProperty('valor_actualizado_en')
  })

  it('shows server error in modal', async () => {
    const { f, user } = await setup()
    f.set('PUT /api/activo/4', failure(422, 'malo'))
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('malo'))
    expect(document.getElementById('m-status')).toHaveClass('err')
  })

  it('delete confirms then DELETEs', async () => {
    const { guardados, user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('¿Eliminar "Casa"?')
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(guardados()).toHaveLength(1))
    expect(guardados()[0]).toMatchObject({ method: 'DELETE', url: '/api/activo/4', headers: H })
  })

  it('delete cancelled does nothing', async () => {
    const { guardados, user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(guardados()).toHaveLength(0)
  })

  it('update value posts to the valor endpoint', async () => {
    const { f, guardados, user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Actualizar valor' }))
    expect(await screen.findByText('Actualizar valor · Casa')).toBeInTheDocument()
    expect(document.getElementById('activo-update-preview')).not.toHaveClass('visible')
    await user.type(document.getElementById('m-nuevo-valor') as HTMLInputElement, '180000')
    await waitFor(() => expect(document.getElementById('activo-update-preview')).toHaveClass('visible'))
    expect(f.calls.filter((c) => c.url === '/api/activo/4/valor/preview').at(-1)).toMatchObject({ method: 'POST', headers: H, body: { nuevo_valor: 180000 } })
    expect(document.getElementById('activo-delta')).toHaveTextContent(/\+.*30\.000/)
    expect(document.getElementById('activo-total')).toHaveTextContent('80,0%')
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))
    await waitFor(() => expect(guardados()).toHaveLength(1))
    expect(guardados()[0]).toMatchObject({ method: 'POST', url: '/api/activo/4/valor', headers: H, body: { nuevo_valor: 180000 } })
    expect(guardados()[0]?.body).not.toHaveProperty('fecha')
  })

  it('update value shows the backend 422 for an empty value', async () => {
    const { f, guardados, user } = await setup()
    f.set('POST /api/activo/4/valor', failure(422, 'Input should be greater than 0'))
    await user.click(screen.getByRole('button', { name: 'Actualizar valor' }))
    await user.click(await screen.findByRole('button', { name: 'Actualizar' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('Input should be greater than 0'))
    expect(guardados()[0]).toMatchObject({ url: '/api/activo/4/valor', body: { nuevo_valor: 0 } })
  })

  it('update form can jump to edit form', async () => {
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Actualizar valor' }))
    await user.click(await screen.findByRole('button', { name: 'Editar activo' }))
    expect(await screen.findByText('Editar activo', { selector: '#modal-title, h2, div' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
  })

  it('sell posts to venta endpoint', async () => {
    const { f, guardados, user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Vender' }))
    await screen.findByText('Vender · Casa')
    expect(document.getElementById('m-precio')).toHaveValue('150.000')
    await waitFor(() => expect(document.getElementById('activo-sell-preview')).toHaveClass('visible'))
    expect(f.calls.find((c) => c.url === '/api/activo/4/venta/preview')).toMatchObject({ method: 'POST', headers: H, body: { precio: 150000 } })
    expect(document.getElementById('sell-gain-ini')).toHaveTextContent(/\+.*50\.000/)
    await user.type(document.getElementById('m-notas') as HTMLInputElement, ' Amigo ')
    await user.click(screen.getByRole('button', { name: 'Confirmar venta' }))
    await waitFor(() => expect(guardados()).toHaveLength(1))
    expect(guardados()[0]?.body).not.toHaveProperty('fecha')
    expect(guardados()[0]).toMatchObject({
      method: 'POST', url: '/api/activo/4/venta', headers: H,
      body: { precio: 150000, notas: 'Amigo', registrar_tx: true },
    })
  })

  it('sell with registrar_tx off', async () => {
    const { guardados, user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Vender' }))
    await screen.findByText('Vender · Casa')
    const precio = document.getElementById('m-precio') as HTMLInputElement
    await user.clear(precio)
    await user.type(precio, '90000')
    await user.click(document.getElementById('m-es-nueva') as HTMLInputElement)
    await user.click(screen.getByRole('button', { name: 'Confirmar venta' }))
    await waitFor(() => expect(guardados()).toHaveLength(1))
    expect(guardados()[0]?.body).toMatchObject({ precio: 90000, notas: '', registrar_tx: false })
  })
})

void within

describe('labels', () => {
  it('el form de activo se encuentra por sus labels', async () => {
    const { user } = await setup([])
    await user.click(screen.getByRole('button', { name: 'Nuevo activo' }))
    expectLabels(modalBody(), {
      Nombre: 'm-nombre',
      'Precio de compra (COP)': 'm-val-ini',
      'Valor actual (COP)': 'm-val-act',
      'Fecha de adquisición': 'm-fecha-adq',
    })
  })
})
