import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { estado } from '../../../test/factories'
import { renderWithProviders } from '../../../test/render'
import { Deudas } from '../index'
import { acc, conResumen, credito, dialog, full, hdr, resumenCompleto, installFakeDate } from './fixtures'

installFakeDate()

describe('pago', () => {
  const pagar = (name: string) => within(document.getElementById('deudas-grid-credito') as HTMLElement).findByText(name)

  it('pagar cuota: avanzar_cuota true, desglose y body', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/1/pago': {}, 'POST /api/deuda/1/pago/preview': { capital: 400000, intereses: 100000 } })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Pagar cuota'))
    expect(dialog()).toHaveTextContent('Pagar cuota · Crédito carro')
    expect(document.getElementById('m-monto')).toHaveValue('500.000')
    expect(document.getElementById('pay-breakdown')).toHaveStyle({ display: 'none' })
    await user.type(document.getElementById('m-saldo-nuevo') as HTMLElement, '5600000')
    expect(document.getElementById('pay-breakdown')).toHaveStyle({ display: 'block' })
    await waitFor(() => expect(document.getElementById('pay-capital')).toHaveTextContent('400.000'))
    expect(document.getElementById('pay-intereses')).toHaveTextContent('100.000')
    const previews = f.mutations().filter((c) => c.url === '/api/deuda/1/pago/preview')
    expect(previews.at(-1)).toMatchObject({ method: 'POST', headers: hdr, body: { total_pagado: 500000, nuevo_saldo: 5600000 } })
    await user.type(document.getElementById('m-notas') as HTMLElement, ' Cuota #1 ')
    await user.click(screen.getByText('Registrar pago'))
    await waitFor(() => expect(acc(f)).toHaveLength(1))
    const m = acc(f)[0]
    expect(m).toMatchObject({ method: 'POST', url: '/api/deuda/1/pago', headers: hdr })
    expect(m?.body).toMatchObject({
      nuevo_saldo: 5600000,
      total_pagado: 500000,
      intereses: 100000,
      notas: 'Cuota #1',
      registrar_tx: true,
      avanzar_cuota: true,
    })
    expect((m?.body as { fecha: string }).fecha).toBe('2026-09-05T10:30')
    expect((m?.body as { descripcion: string }).descripcion).toBe('Cuota · Crédito carro (capital $400.000, intereses $100.000)')
  })

  it('muestra el desglose que devuelve el backend para un saldo fraccionario', async () => {
    const user = userEvent.setup()
    conResumen(resumenCompleto, { 'POST /api/deuda/1/pago': {}, 'POST /api/deuda/1/pago/preview': { capital: 235, intereses: 266 } })
    renderWithProviders(<Deudas active />, { estado: estado({ deudas: [{ ...credito, saldo_actual: 1234.5, cuota_mensual: 500 }] }) })
    await user.click(await pagar('Pagar cuota'))
    await user.type(document.getElementById('m-saldo-nuevo') as HTMLElement, '1000')
    await waitFor(() => expect(document.getElementById('pay-capital')).toHaveTextContent('$235'))
    expect(document.getElementById('pay-intereses')).toHaveTextContent('$266')
  })

  it('pagar sin registrar_tx', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/1/pago': {}, 'POST /api/deuda/1/pago/preview': { capital: 400000, intereses: 100000 } })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Pagar cuota'))
    await user.type(document.getElementById('m-saldo-nuevo') as HTMLElement, '5500000')
    await user.click(document.getElementById('m-es-nueva') as HTMLElement)
    await user.click(screen.getByText('Registrar pago'))
    await waitFor(() => expect(acc(f)).toHaveLength(1))
    expect(acc(f)[0]?.body).toMatchObject({ registrar_tx: false, avanzar_cuota: true })
  })

  it('abonar (liquidar): prellenado, avanzar_cuota false', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/1/pago': {}, 'POST /api/deuda/1/pago/preview': { capital: 6000000, intereses: 0 } })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Abonar'))
    expect(dialog()).toHaveTextContent('Abonar · Crédito carro')
    expect(document.getElementById('m-monto')).toHaveValue('6.000.000')
    expect(document.getElementById('m-saldo-nuevo')).toHaveValue('0')
    expect(document.getElementById('pay-breakdown')).toHaveStyle({ display: 'block' })
    await waitFor(() => expect(document.getElementById('pay-capital')).toHaveTextContent('6.000.000'))
    expect(document.getElementById('pay-intereses')).toHaveTextContent('0')
    expect(f.mutations()[0]).toMatchObject({ url: '/api/deuda/1/pago/preview', body: { total_pagado: 6000000, nuevo_saldo: 0 } })
    await user.click(within(dialog()).getByRole('button', { name: 'Abonar' }))
    await waitFor(() => expect(acc(f)).toHaveLength(1))
    expect(acc(f)[0]).toMatchObject({
      url: '/api/deuda/1/pago',
      body: { nuevo_saldo: 0, total_pagado: 6000000, intereses: 0, avanzar_cuota: false, registrar_tx: true },
    })
  })

  it('validaciones del pago', async () => {
    const user = userEvent.setup()
    conResumen()
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Pagar cuota'))
    const status = () => document.getElementById('m-status') as HTMLElement
    await user.click(screen.getByText('Registrar pago'))
    expect(status()).toHaveTextContent('Ingresá el saldo capital después del pago')
    await user.clear(document.getElementById('m-monto') as HTMLElement)
    await user.click(screen.getByText('Registrar pago'))
    expect(status()).toHaveTextContent('Ingresá el monto total pagado')
    await user.type(document.getElementById('m-monto') as HTMLElement, '10')
    await user.type(document.getElementById('m-saldo-nuevo') as HTMLElement, '7000000')
    expect(status()).not.toHaveTextContent('El saldo nuevo no puede superar el saldo anterior')
  })

  it('"Editar deuda" desde el pago abre el form de edición', async () => {
    const user = userEvent.setup()
    conResumen()
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Pagar cuota'))
    await user.click(screen.getByText('Editar deuda'))
    await waitFor(() => expect(dialog()).toHaveTextContent('Editar deuda'))
  })
})
