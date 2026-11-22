import { waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { H, clickInGrid, mockInv, modal, reales, setup, typeMoney, installFakeClock } from './helpers'

installFakeClock()

describe('actualizar valor (variable)', () => {
  it('preview y PUT con el objeto completo', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'PUT /api/inv/6': {}, 'POST /api/inv/6/valor/preview': { delta: 150000, total: 100000, total_pct: 20 } })
    await setup()
    await clickInGrid(user, 'variable', 'Actualizar')
    expect(document.getElementById('inv-value-preview')).toHaveStyle({ display: 'none' })
    await typeMoney(user, 'm-nuevo-valor', '600000')
    await waitFor(() => expect(document.getElementById('inv-delta')).toHaveTextContent('+$150.000'))
    expect(f.callsTo('POST', '/api/inv/6/valor/preview')[0]).toMatchObject({ headers: H, body: { nuevo_valor: 600000 } })
    expect(document.getElementById('inv-total-gain')).toHaveTextContent('+$100.000 (+20,0%)')
    await user.click(modal().getByRole('button', { name: 'Actualizar' }))
    await waitFor(() => expect(reales(f)).toHaveLength(1))
    expect(reales(f)[0]).toMatchObject({ method: 'PUT', url: '/api/inv/6', headers: H })
    expect(reales(f)[0]?.body).toEqual({
      nombre: 'Fondo X',
      tipo: 'variable',
      monto_invertido: 500000,
      valor_actual: 600000,
      tasa_ea: null,
      fecha_inicio: '2026-02-01',
      pago: null,
      dia_pago: null,
      valor_actualizado_en: '2026-11-12T10:30',
    })
  })

  it('valor inválido', async () => {
    const user = userEvent.setup()
    const f = mockInv()
    await setup()
    await clickInGrid(user, 'variable', 'Actualizar')
    await user.click(modal().getByRole('button', { name: 'Actualizar' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Valor inválido')
    expect(f.mutations()).toHaveLength(0)
  })
})

describe('aporte', () => {
  it('usa valor actual + aporte si no se da nuevo valor', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'POST /api/inv/6/aporte': {}, 'POST /api/inv/6/aporte/preview': { nuevo_valor_estimado: 500000 } })
    await setup()
    await clickInGrid(user, 'variable', '+ Más')
    await typeMoney(user, 'm-monto', '50000')
    await waitFor(() => expect(document.getElementById('add-more-hint')).toHaveTextContent('Estimado: $500.000. Ajustá si el mercado se movió.'))
    expect(f.callsTo('POST', '/api/inv/6/aporte/preview')[0]).toMatchObject({ headers: H, body: { monto: 50000 } })
    expect(document.getElementById('m-nuevo-valor')).toHaveAttribute('placeholder', '500.000')
    await user.click(modal().getByRole('button', { name: 'Agregar aporte' }))
    await waitFor(() => expect(reales(f)).toHaveLength(1))
    expect(reales(f)[0]).toMatchObject({
      method: 'POST',
      url: '/api/inv/6/aporte',
      headers: H,
      body: { monto: 50000, nuevo_valor: 500000, fecha: '2026-11-12T10:30', notas: '', registrar_tx: true },
    })
  })

  it('nuevo valor explícito, notas y sin registrar', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'POST /api/inv/6/aporte': {} })
    await setup()
    await clickInGrid(user, 'variable', '+ Más')
    await typeMoney(user, 'm-monto', '50000')
    await typeMoney(user, 'm-nuevo-valor', '520000')
    await user.type(document.getElementById('m-notas') as HTMLElement, 'mensual')
    await user.click(modal().getByText('Opciones de registro'))
    await user.click(modal().getByLabelText('Registrar en transacciones'))
    await user.click(modal().getByRole('button', { name: 'Agregar aporte' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ monto: 50000, nuevo_valor: 520000, notas: 'mensual', registrar_tx: false })
  })

  it('monto requerido', async () => {
    const user = userEvent.setup()
    const f = mockInv()
    await setup()
    await clickInGrid(user, 'variable', '+ Más')
    await user.click(modal().getByRole('button', { name: 'Agregar aporte' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Ingresá el monto que agregas')
    expect(f.mutations()).toHaveLength(0)
  })
})
