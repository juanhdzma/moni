import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { estado } from '../../../test/factories'
import { renderWithProviders } from '../../../test/render'
import { Deudas } from '../index'
import { acc, conResumen, dialog, full, hdr, resumenCompleto, tarjeta, installFakeDate } from './fixtures'

installFakeDate()

describe('adelanto', () => {
  const abrir = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(await within(document.getElementById('deudas-grid-tarjeta') as HTMLElement).findByText('Adelanto'))

  it('tarjeta con cupo: manda el disponible y el backend deriva el saldo', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/2/adelanto': {}, 'POST /api/deuda/2/adelanto/preview': { comision: 50000, nuevo_saldo: 1550000 } })
    renderWithProviders(<Deudas active />, { estado: full() })
    await abrir(user)
    expect(dialog()).toHaveTextContent('Pedir adelanto · Visa Oro')
    await user.type(document.getElementById('m-monto') as HTMLElement, '500000')
    await user.type(document.getElementById('m-disponible-nuevo') as HTMLElement, '3450000')
    await waitFor(() => expect(document.getElementById('adelanto-deuda')).toHaveTextContent('1.550.000'))
    await waitFor(() => expect(document.getElementById('adelanto-comision')).toHaveTextContent('50.000'))
    expect(document.getElementById('adelanto-comision-row')).toHaveStyle({ display: 'flex' })
    const previews = f.mutations().filter((c) => c.url === '/api/deuda/2/adelanto/preview')
    expect(previews.at(-1)).toMatchObject({ method: 'POST', headers: hdr, body: { monto: 500000, disponible_nuevo: 3450000 } })
    await user.click(screen.getByText('Pedir adelanto'))
    await waitFor(() => expect(acc(f)).toHaveLength(1))
    const m = acc(f)[0]
    expect(m).toMatchObject({ method: 'POST', url: '/api/deuda/2/adelanto', headers: hdr })
    expect(m?.body).toMatchObject({
      monto: 500000,
      disponible_nuevo: 3450000,
      notas: '',
      registrar_tx: true,
    })
    expect(m?.body).not.toHaveProperty('nuevo_saldo')
    expect(m?.body).not.toHaveProperty('descripcion')
    expect(m?.body).not.toHaveProperty('fecha')
  })

  it('tarjeta sin cupo: pide saldo después; validaciones', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/2/adelanto': {}, 'POST /api/deuda/2/adelanto/preview': { comision: 50000 } })
    renderWithProviders(<Deudas active />, { estado: estado({ deudas: [{ ...tarjeta, cupo: 0 }] }) })
    await abrir(user)
    expect(document.getElementById('m-disponible-nuevo')).toBeNull()
    const status = () => document.getElementById('m-status') as HTMLElement
    await user.click(screen.getByText('Pedir adelanto'))
    expect(status()).toHaveTextContent('Ingresá el monto del adelanto')
    await user.type(document.getElementById('m-monto') as HTMLElement, '100')
    await user.click(screen.getByText('Pedir adelanto'))
    expect(status()).toHaveTextContent('Ingresá el saldo después del adelanto')
    await user.clear(document.getElementById('m-saldo-nuevo') as HTMLElement)
    await user.type(document.getElementById('m-saldo-nuevo') as HTMLElement, '1100000')
    await user.click(screen.getByText('Pedir adelanto'))
    await waitFor(() => expect(acc(f)).toHaveLength(1))
    expect(acc(f)[0]?.body).toMatchObject({ monto: 100, nuevo_saldo: 1100000 })
  })

  it('con cupo sin disponible: mensaje de cupo', async () => {
    const user = userEvent.setup()
    conResumen()
    renderWithProviders(<Deudas active />, { estado: full() })
    await abrir(user)
    await user.type(document.getElementById('m-monto') as HTMLElement, '100')
    await user.click(screen.getByText('Pedir adelanto'))
    expect(document.getElementById('m-status')).toHaveTextContent('Ingresá el cupo disponible después del adelanto')
  })
})
