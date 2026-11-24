import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CDT, mockInv, modal, setup, installFakeClock } from './helpers'

installFakeClock()

describe('render', () => {
  it('resumen y tarjetas', async () => {
    mockInv()
    await setup()
    const total = document.getElementById('inv-total') as HTMLElement
    expect(total).toHaveTextContent('2 posiciones')
    expect(total).toHaveTextContent(/ganado|perdido/)
    const fija = document.getElementById('inv-grid-fija') as HTMLElement
    expect(within(fija).getByText('CDT Uno')).toBeInTheDocument()
    expect(fija).toHaveTextContent('12,00% EA')
    expect(fija).toHaveTextContent('Desde')
    expect(within(fija).getByRole('button', { name: 'Rendimiento' })).toBeInTheDocument()
    const variable = document.getElementById('inv-grid-variable') as HTMLElement
    expect(within(variable).getByRole('button', { name: 'Actualizar' })).toBeInTheDocument()
    expect(variable).toHaveTextContent('Valor sin actualizar hace más de 1 mes')
    expect(fija).not.toHaveTextContent('Valor sin actualizar')
  })

  it('próximo pago de una mensual', async () => {
    mockInv()
    await setup([{ ...CDT, pago: 'mensual', dia_pago: 15, proximo_pago: { fecha: '2026-11-15', texto: 'en 3d' } }])
    expect(document.getElementById('inv-grid-fija')).toHaveTextContent('en 3d')
  })

  it('estados vacíos', async () => {
    mockInv()
    await setup([])
    expect(screen.getByText('Sin inversiones fijas')).toBeInTheDocument()
    expect(screen.getByText('Sin inversiones variables')).toBeInTheDocument()
    expect(document.getElementById('inv-total')).toHaveTextContent('0 posiciones')
  })

  it('botones accesibles por teclado', async () => {
    const user = userEvent.setup()
    await setup()
    const fija = document.getElementById('inv-grid-fija') as HTMLElement
    const btn = within(fija).getByRole('button', { name: 'Editar' })
    btn.focus()
    await user.keyboard('{Enter}')
    expect(modal().getByText('Editar inversión')).toBeInTheDocument()
  })
})
