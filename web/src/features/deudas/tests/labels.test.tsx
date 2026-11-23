import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../test/render'
import { expectLabels, modalBody } from '../../../test/labels'
import { Deudas } from '../index'
import { conResumen, full, installFakeDate } from './fixtures'

installFakeDate()

describe('labels', () => {
  const pagar = (name: string) => within(document.getElementById('deudas-grid-credito') as HTMLElement).findByText(name)

  it('el form de deuda se encuentra por sus labels', async () => {
    conResumen()
    const user = userEvent.setup()
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(screen.getByText('Nueva deuda'))
    expectLabels(modalBody(), {
      Nombre: 'm-nombre',
      'Monto del crédito (COP)': 'm-monto-ini',
      'Saldo actual (COP)': 'm-saldo',
      'Tasa EA (%)': 'm-tasa',
      'Cuota mensual': 'm-cuota',
      'Fecha inicio': 'm-fecha-ini',
      'Próxima cuota': 'm-proxima',
    })
    expect(within(modalBody()).getByRole('group', { name: 'Tipo' })).toBeInTheDocument()
    await user.click(within(modalBody()).getByRole('button', { name: 'Tarjeta' }))
    expectLabels(modalBody(), { 'Cupo (COP)': 'm-cupo', Franquicia: 'm-franquicia' })
  })

  it('el form de pago se encuentra por sus labels', async () => {
    conResumen()
    const user = userEvent.setup()
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Pagar cuota'))
    expectLabels(modalBody(), {
      'Monto total pagado (COP)': 'm-monto',
      'Saldo capital después del pago': 'm-saldo-nuevo',
      'Fecha del pago (ahora si se omite)': 'm-fecha',
      'Notas (opcional)': 'm-notas',
    })
  })
})
