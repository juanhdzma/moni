import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { categoriasBase, estado, tx } from '@/test/factories'
import { failure } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { expectLabels, modalBody } from '@/test/labels'
import { Transacciones, openTxForm } from '..'
import { datos, filaDe, listado, mockFetch, opcionesTx, ui } from './fixtures'

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 5, 15, 10, 30) }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('tx form: edición de datos atípicos', () => {
  const editar = async (t: ReturnType<typeof tx>) => {
    const user = userEvent.setup()
    ui(estado({ transacciones: [t] }))
    await user.click(await screen.findByRole('button', { name: /Editar/ }))
    await screen.findByRole('button', { name: 'Guardar cambios' })
    return user
  }

  it('conserva la categoría que ya no está en la lista', async () => {
    const t = tx('gasto', 'Categoría vieja', 100, { id: 9, fecha: '2026-03-10T10:00', descripcion: 'x' })
    const f = mockFetch({
      'PUT /api/tx/9': { ok: true },
      'GET /api/tx': listado({ items: [filaDe(t)] }),
      'GET /api/tx/opciones': opcionesTx({
        categorias: { ingreso: [], gasto: ['Inversión', 'Categoría vieja'] },
        inicial: { tipo: 'gasto', categoria: 'Categoría vieja', tarjeta_id: null, fecha: '2026-03-10T10:00' },
      }),
    })
    const user = await editar(t)
    expect(await screen.findByRole('button', { name: 'Guardar cambios' })).toBeTruthy()
    expect(f.callsTo('GET', '/api/tx/opciones?tx_id=9')).toHaveLength(1)
    expect(document.getElementById('m-cat')).toHaveTextContent('Categoría vieja')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ categoria: 'Categoría vieja', monto: 100 })
  })

  it('una fecha sin hora abre con T00:00 y guarda', async () => {
    const t = tx('gasto', 'Comida', 100, { id: 9, fecha: '2026-03-10', descripcion: 'x' })
    const f = mockFetch({
      'PUT /api/tx/9': { ok: true },
      'GET /api/tx': listado({ items: [filaDe(t)] }),
      'GET /api/tx/opciones': opcionesTx({ inicial: { tipo: 'gasto', categoria: 'Comida', tarjeta_id: null, fecha: '2026-03-10T00:00' } }),
    })
    const user = await editar(t)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ fecha: '2026-03-10T00:00' })
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

  it('sin validar en el cliente: muestra el 422 del backend', async () => {
    const f = mockFetch({ 'POST /api/tx': failure(422, 'monto: debe ser mayor que 0') })
    const user = await abrirNuevo()
    await user.click(await screen.findByRole('button', { name: 'Agregar' }))
    await waitFor(() => expect(document.getElementById('m-status')?.textContent).toBe('monto: debe ser mayor que 0'))
    expect(document.getElementById('m-status')?.className).toContain('err')
    expect(f.mutations()[0]?.body).toMatchObject({ monto: 0, fecha: '2026-06-15T10:30' })
  })

  it('adds a custom category: POST /api/categorias then selects it', async () => {
    const conMascotas = { ...categoriasBase(), gasto: [...categoriasBase().gasto, { nombre: 'Mascotas', sistema: false }] }
    let creada = false
    const f = mockFetch({
      'POST /api/categorias': () => {
        creada = true
        return conMascotas
      },
      'GET /api/bootstrap': estado({ categorias: conMascotas }),
      'GET /api/tx/opciones': () =>
        opcionesTx({ categorias: { ingreso: ['Crédito recibido'], gasto: creada ? ['Inversión', 'Mascotas'] : ['Inversión'] } }),
    })
    const user = await abrirNuevo()
    await user.click(screen.getByTitle('Agregar categoría'))
    await user.type(document.getElementById('new-cat-name') as HTMLElement, 'Mascotas{Enter}')
    await waitFor(() => expect(document.querySelector('#m-cat .cdd-label')?.textContent).toBe('Mascotas'))
    expect(f.mutations()[0]).toMatchObject({ method: 'POST', url: '/api/categorias', headers: { 'X-Moni-Request': '1' }, body: { tipo: 'gasto', nombre: 'Mascotas' } })
    expect(document.getElementById('new-cat-wrap')).toBeNull()
  })

  it('edit sends PUT without id and delete confirms then sends DELETE', async () => {
    const f = mockFetch({
      'PUT /api/tx/1': { ok: true },
      'GET /api/tx/opciones': opcionesTx({
        categorias: { ingreso: [], gasto: ['Inversión', 'Comida'] },
        inicial: { tipo: 'gasto', categoria: 'Comida', tarjeta_id: 5, fecha: '2026-03-10T10:00' },
      }),
    })
    const user = userEvent.setup()
    ui()
    await user.click(await screen.findByRole('button', { name: 'Editar Mercado' }))
    await screen.findByRole('button', { name: 'Guardar cambios' })
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
    expect(f.mutations()[0]?.body).not.toHaveProperty('id')
  })

  it('delete confirms then sends DELETE', async () => {
    const f = mockFetch({ 'DELETE /api/tx/1': { ok: true } })
    const user = userEvent.setup()
    ui()
    await user.click(await screen.findByRole('button', { name: 'Editar Mercado' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }))
    expect(screen.getByText('¿Eliminar este movimiento?')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'DELETE', url: '/api/tx/1', headers: { 'X-Moni-Request': '1' } })
  })

  it('un delete fallido recarga y muestra el banner', async () => {
    const f = mockFetch({ 'DELETE /api/tx/1': failure(500, 'no se pudo borrar') })
    const user = userEvent.setup()
    ui()
    await user.click(await screen.findByRole('button', { name: 'Editar Mercado' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }))
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    await waitFor(() => expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
  })

  it('shows API error in modal status', async () => {
    mockFetch({ 'PUT /api/tx/1': failure(422, 'monto inválido') })
    const user = userEvent.setup()
    ui()
    await user.click(await screen.findByRole('button', { name: 'Editar Mercado' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(document.getElementById('m-status')?.textContent).toBe('monto inválido'))
    expect(document.getElementById('m-status')?.className).toContain('err')
    expect(screen.getByText('Editar movimiento')).toBeTruthy()
  })

  it('does not open the form for transfers', () => {
    mockFetch()
    ui()
    const ctx = { openModal: vi.fn(), setPendingProxOp: vi.fn(), showBanner: vi.fn() }
    openTxForm(ctx, tx('transfer', 'Pago deuda', 100, { id: 3 }))
    expect(ctx.openModal).not.toHaveBeenCalled()
  })
})

describe('labels', () => {
  it('cada campo del form se encuentra por su label', async () => {
    mockFetch()
    const user = userEvent.setup()
    renderWithProviders(<Transacciones active />, { estado: datos() })
    await user.click(screen.getByRole('button', { name: 'Nuevo movimiento' }))
    await user.click(await screen.findByRole('button', { name: 'Gasto' }))
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
