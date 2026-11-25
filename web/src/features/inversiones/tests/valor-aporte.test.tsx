import { waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { failure, previewConMonto } from '@/test/mockFetch'
import { H, clickInGrid, mockInv, modal, reales, setup, typeMoney, installFakeClock } from './helpers'

installFakeClock()

describe('actualizar valor (variable)', () => {
  it('preview y POST a /valor con nuevo valor y fecha', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'POST /api/inv/6/valor': {}, 'POST /api/inv/6/valor/preview': previewConMonto('nuevo_valor', { delta: 150000, total: 100000, total_pct: 20 }) })
    await setup()
    await clickInGrid(user, 'variable', 'Actualizar')
    await waitFor(() => expect(f.callsTo('POST', '/api/inv/6/valor/preview')).toHaveLength(1))
    expect(f.callsTo('POST', '/api/inv/6/valor/preview')[0]).toMatchObject({ body: { nuevo_valor: 0 } })
    expect(document.getElementById('inv-value-preview')).not.toHaveClass('visible')
    await typeMoney(user, 'm-nuevo-valor', '600000')
    await waitFor(() => expect(document.getElementById('inv-delta')).toHaveTextContent('+$150.000'))
    expect(f.callsTo('POST', '/api/inv/6/valor/preview').at(-1)).toMatchObject({ headers: H, body: { nuevo_valor: 600000 } })
    expect(document.getElementById('inv-total-gain')).toHaveTextContent('+$100.000 (+20,0%)')
    await user.click(modal().getByRole('button', { name: 'Actualizar' }))
    await waitFor(() => expect(reales(f)).toHaveLength(1))
    expect(reales(f)[0]).toMatchObject({ method: 'POST', url: '/api/inv/6/valor', headers: H, body: { nuevo_valor: 600000 } })
    expect(reales(f)[0]?.body).not.toHaveProperty('fecha')
  })

  it('valor inválido lo rechaza el backend', async () => {
    const user = userEvent.setup()
    mockInv({ 'POST /api/inv/6/valor': failure(422, [{ msg: 'Input should be greater than 0' }]) })
    await setup()
    await clickInGrid(user, 'variable', 'Actualizar')
    await user.click(modal().getByRole('button', { name: 'Actualizar' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('greater than 0'))
  })
})

describe('aporte', () => {
  it('usa valor actual + aporte si no se da nuevo valor', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'POST /api/inv/6/aporte': {}, 'POST /api/inv/6/aporte/preview': { nuevo_valor_estimado: 500000, texto_estimado: 'Estimado: $500.000. Ajustá si el mercado se movió.' } })
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
      body: { monto: 50000, notas: '', registrar_tx: true },
    })
    expect(reales(f)[0]?.body).not.toHaveProperty('nuevo_valor')
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
    await waitFor(() => expect(reales(f)).toHaveLength(1))
    expect(reales(f)[0]?.body).toMatchObject({ monto: 50000, nuevo_valor: 520000, notas: 'mensual', registrar_tx: false })
  })

  it('monto requerido lo valida el backend', async () => {
    const user = userEvent.setup()
    mockInv({ 'POST /api/inv/6/aporte': failure(422, [{ msg: 'monto requerido' }]) })
    await setup()
    await clickInGrid(user, 'variable', '+ Más')
    await user.click(modal().getByRole('button', { name: 'Agregar aporte' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('monto requerido'))
  })
})
