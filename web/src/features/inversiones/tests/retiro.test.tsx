import { waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { failure } from '@/test/mockFetch'
import { H, clickInGrid, mockInv, modal, setup, typeMoney, installFakeClock, type User } from './fixtures'

installFakeClock()

describe('retiro', () => {
  const abrir = async (user: User) => {
    await setup()
    await clickInGrid(user, 'fija', 'Retirar')
  }

  it('total', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'POST /api/inv/5/retiro': {} })
    await abrir(user)
    await waitFor(() => expect(document.getElementById('m-monto-total')).toHaveValue('1.010.000'))
    expect(document.getElementById('retiro-parcial-fields')).toBeNull()
    await user.click(modal().getByRole('button', { name: 'Confirmar retiro' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST',
      url: '/api/inv/5/retiro',
      headers: H,
      body: { tipo: 'total', monto: 1010000, notas: '', registrar_tx: true },
    })
    expect(f.mutations()[0]?.body).not.toHaveProperty('saldo_queda')
  })

  it('parcial con saldo_queda', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'POST /api/inv/5/retiro': {} })
    await abrir(user)
    await user.click(modal().getByRole('button', { name: 'Parcial' }))
    expect(document.getElementById('retiro-total-fields')).toBeNull()
    await typeMoney(user, 'm-monto-parcial', '200000')
    await typeMoney(user, 'm-saldo-queda', '810000')
    await user.type(document.getElementById('m-notas-retiro') as HTMLElement, 'parte')
    await user.click(modal().getByRole('button', { name: 'Confirmar retiro' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toEqual({
      tipo: 'parcial',
      monto: 200000,
      saldo_queda: 810000,
      notas: 'parte',
      registrar_tx: true,
    })
  })

  it('parcial sin saldo no manda saldo_queda y muestra el 400 del backend', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'POST /api/inv/5/retiro': failure(400, 'saldo_queda requerido para retiro parcial') })
    await abrir(user)
    await user.click(modal().getByRole('button', { name: 'Parcial' }))
    await typeMoney(user, 'm-monto-parcial', '1000')
    await user.click(modal().getByRole('button', { name: 'Confirmar retiro' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('saldo_queda requerido'))
    expect(f.mutations()[0]?.body).not.toHaveProperty('saldo_queda')
  })

  it('error del backend', async () => {
    const user = userEvent.setup()
    mockInv({ 'POST /api/inv/5/retiro': failure(400, 'no') })
    await abrir(user)
    await user.click(modal().getByRole('button', { name: 'Confirmar retiro' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('no'))
  })
})
