import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { failure } from '../../../test/mockFetch'
import { CDT, H, mockInv, modal, setup, typeMoney, installFakeClock, type User } from './helpers'

installFakeClock()

describe('rendimiento', () => {
  const abrir = async (user: User, inv = CDT) => {
    await setup([inv])
    await user.click(screen.getByRole('button', { name: 'Rendimiento' }))
  }

  it('CDT al vencimiento capitaliza por defecto y oculta registrar en transacciones', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'POST /api/inv/5/rendimiento': {} })
    await abrir(user)
    expect(document.getElementById('m-monto')).toHaveValue('9.584')
    await waitFor(() => expect(document.getElementById('rend-hint')).toHaveTextContent('Sube el valor de la inversión. No entra plata a tu cartera.'))
    expect(document.getElementById('wrap-rend-advanced')).toBeNull()
    await user.type(document.getElementById('m-notas') as HTMLElement, ' nota ')
    await user.click(modal().getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST',
      url: '/api/inv/5/rendimiento',
      headers: H,
      body: { monto: 9584, fecha: '2026-08-20', notas: 'nota', capitaliza: true, registrar_tx: true },
    })
  })

  it('me lo pagan: capitaliza false y registrar_tx true; destildado manda false', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'POST /api/inv/5/rendimiento': {} })
    await abrir(user)
    await user.click(document.getElementById('rend-cuenta') as HTMLElement)
    expect(document.getElementById('rend-hint')).toHaveTextContent('Entra como ingreso a tu cartera. El valor de la inversión no cambia.')
    expect(document.getElementById('wrap-rend-advanced')).toBeInTheDocument()
    await user.click(modal().getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ capitaliza: false, registrar_tx: true })
  })

  it('me lo pagan sin registrar en transacciones', async () => {
    const user = userEvent.setup()
    const f = mockInv({ 'POST /api/inv/5/rendimiento': {} })
    await abrir(user, { ...CDT, pago: 'mensual', dia_pago: 15, capitaliza_default: false })
    await waitFor(() => expect(document.getElementById('rend-hint')).toHaveTextContent('Entra como ingreso'))
    await user.click(modal().getByText('Opciones de registro'))
    await user.click(modal().getByLabelText('Registrar en transacciones'))
    await user.click(modal().getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ capitaliza: false, registrar_tx: false })
  })

  it('el monto inválido lo rechaza el backend y se muestra el error', async () => {
    const user = userEvent.setup()
    mockInv({ 'POST /api/inv/5/rendimiento': failure(422, [{ msg: 'rechazado' }]) })
    await abrir(user)
    await typeMoney(user, 'm-monto', '0')
    await user.click(modal().getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('rechazado'))
    expect(document.getElementById('m-status')).toHaveClass('err')
  })

  it('Editar inversión cierra y abre el form de edición', async () => {
    const user = userEvent.setup()
    mockInv()
    await abrir(user)
    await user.click(modal().getByRole('button', { name: 'Editar inversión' }))
    await waitFor(() => expect(modal().getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument())
  })
})
