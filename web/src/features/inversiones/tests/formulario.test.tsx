import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { failure } from '../../../test/mockFetch'
import { renderWithProviders } from '../../../test/render'
import { estado } from '../../../test/factories'
import { expectLabels, modalBody } from '../../../test/labels'
import { Inversiones } from '../index'
import { H, clickInGrid, mockInv, modal, setup, typeMoney, installFakeClock } from './helpers'

installFakeClock()

describe('crear / editar / eliminar', () => {
  it('crear fija mensual con crear_tx', async () => {
    const user = userEvent.setup()
    const f = mockInv({
      'POST /api/inv': {},
      'GET /api/calc/tasa': (c: { url: string }) =>
        c.url.includes('tipo=mv') ? { ea: 289.6, mv: 12 } : { ea: 12, mv: 0.9489 },
    })
    await setup([])
    await user.click(screen.getByRole('button', { name: 'Nueva inversión' }))
    await user.type(document.getElementById('m-nombre') as HTMLElement, '  CDT Nuevo ')
    await typeMoney(user, 'm-invertido', '2000000')
    await user.type(document.getElementById('m-tasa') as HTMLElement, '12')
    await waitFor(() => expect(document.getElementById('tasa-equiv')).toHaveTextContent('Equivale a 0,9489% MV'))
    expect(f.callsTo('GET', '/api/calc/tasa?valor=12&tipo=ea')).toHaveLength(1)
    await user.click(modal().getByRole('button', { name: 'MV' }))
    await waitFor(() => expect(document.getElementById('tasa-equiv')).toHaveTextContent('Equivale a 289,60% EA'))
    expect(f.callsTo('GET', '/api/calc/tasa?valor=12&tipo=mv')).toHaveLength(1)
    await user.click(modal().getByRole('button', { name: 'EA' }))
    await user.click(document.getElementById('rp-mensual') as HTMLElement)
    await user.type(document.getElementById('m-dia-pago') as HTMLElement, '15')
    await user.click(modal().getByRole('button', { name: 'Agregar inversión' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST',
      url: '/api/inv',
      headers: H,
      body: {
        nombre: 'CDT Nuevo',
        tipo: 'fija',
        monto_invertido: 2000000,
        valor_actual: 2000000,
        tasa_ea: 12,
        tasa_tipo: 'ea',
        fecha_inicio: '2026-11-12',
        pago: 'mensual',
        dia_pago: 15,
        valor_actualizado_en: '2026-11-12',
        crear_tx: true,
      },
    })
  })

  it('crear variable sin tasa/pago y con crear_tx false', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'POST /api/inv': {} })
    await setup([])
    await user.click(screen.getByRole('button', { name: 'Nueva inversión' }))
    await user.click(modal().getByRole('button', { name: 'Variable' }))
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'ETF')
    await typeMoney(user, 'm-invertido', '100000')
    await typeMoney(user, 'm-actual', '120000')
    await user.click(modal().getByText('Opciones de registro'))
    await user.click(modal().getByLabelText('Registrar como nuevo en transacciones'))
    await user.click(modal().getByRole('button', { name: 'Agregar inversión' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toEqual({
      nombre: 'ETF',
      tipo: 'variable',
      monto_invertido: 100000,
      valor_actual: 120000,
      tasa_ea: null,
      fecha_inicio: '2026-11-12',
      pago: null,
      dia_pago: null,
      valor_actualizado_en: '2026-11-12',
      crear_tx: false,
    })
  })

  it('validación: nombre y monto', async () => {
    const user = userEvent.setup()
    const f = mockInv()
    await setup([])
    await user.click(screen.getByRole('button', { name: 'Nueva inversión' }))
    await user.click(modal().getByRole('button', { name: 'Agregar inversión' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Nombre requerido')
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'X')
    await user.click(modal().getByRole('button', { name: 'Agregar inversión' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Monto invertido requerido')
    expect(f.mutations()).toHaveLength(0)
  })

  it('editar: PUT sin crear_tx y valor_actualizado_en conservado', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'PUT /api/inv/5': {} })
    await setup()
    await clickInGrid(user, 'fija', 'Editar')
    expect(modal().queryByText('Opciones de registro')).toBeNull()
    expect(document.getElementById('m-tasa')).toHaveValue(12)
    await user.clear(document.getElementById('m-nombre') as HTMLElement)
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'CDT Dos')
    await user.click(modal().getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'PUT', url: '/api/inv/5', headers: H })
    expect(f.mutations()[0]?.body).toEqual({
      nombre: 'CDT Dos',
      tipo: 'fija',
      monto_invertido: 1000000,
      valor_actual: 1010000,
      tasa_ea: 12,
      tasa_tipo: 'ea',
      fecha_inicio: '2026-01-10',
      pago: 'vencimiento',
      dia_pago: null,
      valor_actualizado_en: '2026-11-01',
    })
  })

  it('editar cambiando el valor actual usa la fecha de hoy', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'PUT /api/inv/5': {} })
    await setup()
    await clickInGrid(user, 'fija', 'Editar')
    await typeMoney(user, 'm-actual', '1100000')
    await user.click(modal().getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ valor_actual: 1100000, valor_actualizado_en: '2026-11-12' })
  })

  it('eliminar: confirm y DELETE', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'DELETE /api/inv/5': {} })
    const confirmFn = vi.fn(() => true)
    vi.stubGlobal('confirm', confirmFn)
    await setup()
    await clickInGrid(user, 'fija', 'Editar')
    await user.click(modal().getByRole('button', { name: 'Eliminar' }))
    expect(confirmFn).toHaveBeenCalledWith('¿Eliminar "CDT Uno"?')
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'DELETE', url: '/api/inv/5', headers: H })
  })

  it('eliminar cancelado no envía nada', async () => {
    const user = userEvent.setup()
    const f = mockInv()
    vi.stubGlobal('confirm', () => false)
    await setup()
    await clickInGrid(user, 'fija', 'Editar')
    await user.click(modal().getByRole('button', { name: 'Eliminar' }))
    expect(f.mutations()).toHaveLength(0)
  })

  it('error del backend se muestra en el modal', async () => {
    const user = userEvent.setup()
    mockInv({ 'POST /api/inv': failure(422, [{ msg: 'malo' }, { msg: 'peor' }]) })
    await setup([])
    await user.click(screen.getByRole('button', { name: 'Nueva inversión' }))
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'X')
    await typeMoney(user, 'm-invertido', '10')
    await user.click(modal().getByRole('button', { name: 'Agregar inversión' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveClass('err'))
    expect(document.getElementById('m-status')).toHaveTextContent('malo, peor')
  })
})

describe('labels', () => {
  it('el form de inversión se encuentra por sus labels', async () => {
    mockInv()
    const user = userEvent.setup()
    renderWithProviders(<Inversiones active />, { estado: estado() })
    await user.click(screen.getByRole('button', { name: 'Nueva inversión' }))
    expectLabels(modalBody(), {
      Nombre: 'm-nombre',
      'Monto invertido': 'm-invertido',
      'Valor actual': 'm-actual',
      'Tasa de rendimiento': 'm-tasa',
      'Fecha inicio': 'm-fecha-ini',
    })
    expect(within(modalBody()).getByRole('group', { name: 'Tipo' })).toBeInTheDocument()
  })
})
