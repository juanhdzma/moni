import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { failure } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { estado } from '@/test/factories'
import { expectLabels, modalBody } from '@/test/labels'
import { Inversiones } from '@/features/inversiones/index'
import { H, clickInGrid, mockInv, modal, setup, typeMoney, installFakeClock } from './fixtures'

installFakeClock()

describe('crear / editar / eliminar', () => {
  it('crear fija mensual con crear_tx', async () => {
    const user = userEvent.setup()
    const f = mockInv({
      'POST /api/inv': {},
      'GET /api/calc/tasa': (c: { url: string }) =>
        c.url.includes('tipo=mv') ? { ea: 289.6, mv: 12, texto: 'Equivale a 289,60% EA' } : { ea: 12, mv: 0.9489, texto: 'Equivale a 0,9489% MV' },
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
        tasa_ea: 12,
        tasa_tipo: 'ea',
        fecha_inicio: '2026-08-20',
        pago: 'mensual',
        dia_pago: 15,
        crear_tx: true,
      },
    })
    expect(f.mutations()[0]?.body).not.toHaveProperty('valor_actual')
    expect(f.mutations()[0]?.body).not.toHaveProperty('valor_actualizado_en')
  })

  it('los campos visibles salen de meta: la fija pide tasa y pago, el día solo si el pago lo requiere, la variable ninguno', async () => {
    const user = userEvent.setup()
    mockInv()
    await setup([])
    await user.click(screen.getByRole('button', { name: 'Nueva inversión' }))
    expect(document.getElementById('m-tasa')).not.toBeNull()
    expect(document.getElementById('rp-mensual')).not.toBeNull()
    expect(document.getElementById('m-dia-pago')).toBeNull()
    await user.click(document.getElementById('rp-mensual') as HTMLElement)
    expect(document.getElementById('m-dia-pago')).toHaveAttribute('max', '31')
    expect(document.getElementById('m-dia-pago')).toHaveAttribute('min', '1')
    await user.click(modal().getByRole('button', { name: 'Variable' }))
    expect(document.getElementById('m-tasa')).toBeNull()
    expect(document.getElementById('rp-mensual')).toBeNull()
    expect(document.getElementById('m-dia-pago')).toBeNull()
  })

  it('crear variable manda lo crudo (el backend anula tasa y pago) y crear_tx false', async () => {
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
      fecha_inicio: '2026-08-20',
      pago: 'vencimiento',
      dia_pago: null,
      crear_tx: false,
    })
  })

  it('la validación de nombre y monto es del backend: el 422 se muestra', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'POST /api/inv': failure(422, [{ msg: 'Nombre requerido' }]) })
    await setup([])
    await user.click(screen.getByRole('button', { name: 'Nueva inversión' }))
    await user.click(modal().getByRole('button', { name: 'Agregar inversión' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('Nombre requerido'))
    expect(f.mutations()[0]?.body).toMatchObject({ nombre: '', monto_invertido: 0 })
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
    })
  })

  it('editar cambiando el valor actual no manda fecha de valoración', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'PUT /api/inv/5': {} })
    await setup()
    await clickInGrid(user, 'fija', 'Editar')
    await typeMoney(user, 'm-actual', '1100000')
    await user.click(modal().getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ valor_actual: 1100000 })
    expect(f.mutations()[0]?.body).not.toHaveProperty('valor_actualizado_en')
  })

  it('editar muestra el tipo con la etiqueta de /api/meta', async () => {
    const user = userEvent.setup()
    mockInv()
    await setup()
    await clickInGrid(user, 'fija', 'Editar')
    await waitFor(() => expect(modal().getByText('Fija')).toBeInTheDocument())
  })

  it('eliminar: confirm y DELETE', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'DELETE /api/inv/5': {} })
    await setup()
    await clickInGrid(user, 'fija', 'Editar')
    await user.click(modal().getByRole('button', { name: 'Eliminar' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('¿Eliminar "CDT Uno"?')
    await user.click(modal().getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'DELETE', url: '/api/inv/5', headers: H })
  })

  it('eliminar cancelado no envía nada', async () => {
    const user = userEvent.setup()
    const f = mockInv()
    await setup()
    await clickInGrid(user, 'fija', 'Editar')
    await user.click(modal().getByRole('button', { name: 'Eliminar' }))
    await user.click(modal().getByRole('button', { name: 'Cancelar' }))
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
