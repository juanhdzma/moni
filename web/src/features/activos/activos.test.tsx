import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { activo, estado } from '../../test/factories'
import { failure, mockFetch } from '../../test/mockFetch'
import { renderWithProviders } from '../../test/render'
import { expectLabels, modalBody } from '../../test/labels'
import { fraseActivos } from './frase'
import { Activos } from './index'

const H = { 'X-Moni-Request': '1' }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 5, 15, 10, 30) })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  cleanup()
})

const a1 = activo({ _id: 4, id: 4, nombre: 'Casa', valor_inicial: 100000, valor_actual: 150000, fecha_adquisicion: '2026-01-02', valor_actualizado_en: '2026-06-01T10:00' })

function setup(activos = [a1]) {
  const f = mockFetch({ 'GET /api/all': { transacciones: [], deudas: [], inversiones: [], activos: [], recurrentes: [] } })
  renderWithProviders(<Activos active />, { estado: estado({ activos }) })
  return { f, user: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }) }
}

describe('Activos render', () => {
  it('shows empty state and totals', () => {
    setup([])
    expect(screen.getByText('Sin activos')).toBeInTheDocument()
    expect(screen.getByText('0 activos')).toBeInTheDocument()
    expect(screen.getByText('Todavía no registraste activos.')).toBeInTheDocument()
  })

  it('renders card figures', () => {
    setup()
    expect(screen.getByText('1 activo')).toBeInTheDocument()
    expect(screen.getByText(/Tus activos valen .*150\.000.*50\.000 más de lo que pagaste \(50,0%\)\./)).toBeInTheDocument()
    expect(screen.getByText('Casa')).toBeInTheDocument()
    expect(screen.getAllByText('+50,0%').length).toBeGreaterThan(0)
    expect(screen.getByText(/Adquirido/)).toBeInTheDocument()
    expect(screen.queryByText(/sin actualizar/)).toBeNull()
  })

  it('shows stale warning', () => {
    setup([{ ...a1, valor_actualizado_en: '2026-01-01T10:00' }])
    expect(screen.getByText('Valor sin actualizar hace más de 1 mes')).toBeInTheDocument()
  })

  it('buttons are keyboard reachable', async () => {
    const { user } = setup()
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
    const { f, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Nuevo activo' }))
    await user.type(await screen.findByPlaceholderText('Ej. Apartamento Bogotá'), '  Moto ')
    await user.type(document.getElementById('m-val-ini') as HTMLInputElement, '5000000')
    await user.click(screen.getByRole('button', { name: 'Agregar activo' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST', url: '/api/activo', headers: H,
      body: { nombre: 'Moto', valor_inicial: 5000000, valor_actual: 5000000, fecha_adquisicion: '2026-06-15', valor_actualizado_en: '2026-06-15', crear_tx: true },
    })
  })

  it('creates with crear_tx false', async () => {
    const { f, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Nuevo activo' }))
    await user.type(await screen.findByPlaceholderText('Ej. Apartamento Bogotá'), 'Moto')
    await user.type(document.getElementById('m-val-ini') as HTMLInputElement, '1000')
    await user.type(document.getElementById('m-val-act') as HTMLInputElement, '2000')
    await user.click(document.getElementById('m-es-nueva') as HTMLInputElement)
    await user.click(screen.getByRole('button', { name: 'Agregar activo' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ valor_inicial: 1000, valor_actual: 2000, crear_tx: false })
  })

  it('validates required fields', async () => {
    const { f, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Nuevo activo' }))
    await user.click(await screen.findByRole('button', { name: 'Agregar activo' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Nombre requerido')
    await user.type(screen.getByPlaceholderText('Ej. Apartamento Bogotá'), 'X')
    await user.click(screen.getByRole('button', { name: 'Agregar activo' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Precio de compra requerido')
    expect(f.mutations()).toHaveLength(0)
  })

  it('edit keeps valor_actualizado_en when value unchanged, no crear_tx', async () => {
    const { f, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    expect(await screen.findByText('Valor inicial (COP)')).toBeInTheDocument()
    expect(document.getElementById('m-es-nueva')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'PUT', url: '/api/activo/4', headers: H,
      body: { nombre: 'Casa', valor_inicial: 100000, valor_actual: 150000, fecha_adquisicion: '2026-01-02', valor_actualizado_en: '2026-06-01T10:00' },
    })
    expect(f.mutations()[0]?.body).not.toHaveProperty('crear_tx')
    expect(f.mutations()[0]?.body).not.toHaveProperty('_id')
  })

  it('edit with changed value stamps today', async () => {
    const { f, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    const el = await screen.findByDisplayValue<HTMLInputElement>('150.000')
    await user.clear(el)
    await user.type(el, '160000')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ valor_actual: 160000, valor_actualizado_en: '2026-06-15' })
  })

  it('shows server error in modal', async () => {
    const { f, user } = setup()
    f.set('PUT /api/activo/4', failure(422, 'malo'))
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('malo'))
    expect(document.getElementById('m-status')).toHaveClass('err')
  })

  it('delete confirms then DELETEs', async () => {
    const { f, user } = setup()
    const confirmFn = vi.fn(() => true)
    vi.stubGlobal('confirm', confirmFn)
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }))
    expect(confirmFn).toHaveBeenCalledWith('¿Eliminar "Casa"?')
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'DELETE', url: '/api/activo/4', headers: H })
  })

  it('delete cancelled does nothing', async () => {
    const { f, user } = setup()
    vi.stubGlobal('confirm', () => false)
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }))
    expect(f.mutations()).toHaveLength(0)
  })

  it('update value sends full activo spread', async () => {
    const { f, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Actualizar valor' }))
    const dialog = await screen.findByText('Actualizar valor · Casa')
    expect(dialog).toBeInTheDocument()
    expect(document.getElementById('activo-update-preview')).not.toHaveClass('visible')
    await user.type(document.getElementById('m-nuevo-valor') as HTMLInputElement, '180000')
    expect(document.getElementById('activo-update-preview')).toHaveClass('visible')
    expect(document.getElementById('activo-delta')).toHaveTextContent('+')
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'PUT', url: '/api/activo/4', headers: H,
      body: { id: 4, nombre: 'Casa', valor_inicial: 100000, valor_actual: 180000, valor_actualizado_en: '2026-06-15T10:30', fecha_adquisicion: '2026-01-02' },
    })
  })

  it('update value rejects empty', async () => {
    const { f, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Actualizar valor' }))
    await user.click(await screen.findByRole('button', { name: 'Actualizar' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Valor inválido')
    expect(f.mutations()).toHaveLength(0)
  })

  it('update form can jump to edit form', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Actualizar valor' }))
    await user.click(await screen.findByRole('button', { name: 'Editar activo' }))
    expect(await screen.findByText('Editar activo', { selector: '#modal-title, h2, div' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
  })

  it('sell posts to venta endpoint', async () => {
    const { f, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Vender' }))
    await screen.findByText('Vender · Casa')
    expect(document.getElementById('m-precio')).toHaveValue('150.000')
    expect(document.getElementById('activo-sell-preview')).toHaveClass('visible')
    await user.type(document.getElementById('m-notas') as HTMLInputElement, ' Amigo ')
    await user.click(screen.getByRole('button', { name: 'Confirmar venta' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST', url: '/api/activo/4/venta', headers: H,
      body: { precio: 150000, fecha: '2026-06-15T10:30', notas: 'Amigo', registrar_tx: true },
    })
  })

  it('sell with registrar_tx off and invalid price', async () => {
    const { f, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Vender' }))
    await screen.findByText('Vender · Casa')
    const precio = document.getElementById('m-precio') as HTMLInputElement
    await user.clear(precio)
    await user.click(screen.getByRole('button', { name: 'Confirmar venta' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Precio de venta inválido')
    await user.type(precio, '90000')
    await user.click(document.getElementById('m-es-nueva') as HTMLInputElement)
    await user.click(screen.getByRole('button', { name: 'Confirmar venta' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ precio: 90000, notas: '', registrar_tx: false })
  })
})

void within

describe('labels', () => {
  it('el form de activo se encuentra por sus labels', async () => {
    const { user } = setup([])
    await user.click(screen.getByRole('button', { name: 'Nuevo activo' }))
    expectLabels(modalBody(), {
      Nombre: 'm-nombre',
      'Precio de compra (COP)': 'm-val-ini',
      'Valor actual (COP)': 'm-val-act',
      'Fecha de adquisición': 'm-fecha-adq',
    })
  })
})

describe('fraseActivos', () => {
  it('cubre vacío, igual, ganancia y pérdida', () => {
    expect(fraseActivos(0, 0, 0)).toBe('Todavía no registraste activos.')
    expect(fraseActivos(1, 100, 100)).toContain('lo mismo que pagaste')
    expect(fraseActivos(1, 150, 100)).toContain('más de lo que pagaste (50,0%)')
    expect(fraseActivos(1, 50, 100)).toContain('menos de lo que pagaste (50,0%)')
  })
})
