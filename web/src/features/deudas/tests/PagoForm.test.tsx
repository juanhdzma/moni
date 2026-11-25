import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { estado } from '@/test/factories'
import { failure, previewSi } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { Deudas } from '@/features/deudas/index'
import { acc, conResumen, credito, dialog, full, hdr, resumenCompleto, installFakeDate } from './fixtures'

installFakeDate()

const conSaldo = (ok: unknown) => previewSi((b) => Number(b.total_pagado) > 0 && b.nuevo_saldo !== undefined, ok)

describe('pago', () => {
  const pagar = (name: string) => within(document.getElementById('deudas-grid-credito') as HTMLElement).findByText(name)

  it('pagar cuota: modo cuota, desglose y body', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/1/pago': {}, 'POST /api/deuda/1/pago/preview': conSaldo({ capital: 400000, intereses: 100000 }) })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Pagar cuota'))
    expect(dialog()).toHaveTextContent('Pagar cuota · Crédito carro')
    expect(document.getElementById('m-monto')).toHaveValue('500.000')
    expect(document.getElementById('pay-breakdown')).not.toHaveClass('visible')
    await user.type(document.getElementById('m-saldo-nuevo') as HTMLElement, '5600000')
    await waitFor(() => expect(document.getElementById('pay-breakdown')).toHaveClass('visible'))
    await waitFor(() => expect(document.getElementById('pay-capital')).toHaveTextContent('400.000'))
    expect(document.getElementById('pay-intereses')).toHaveTextContent('100.000')
    const previews = f.mutations().filter((c) => c.url === '/api/deuda/1/pago/preview')
    expect(previews.at(-1)).toMatchObject({ method: 'POST', headers: hdr, body: { total_pagado: 500000, nuevo_saldo: 5600000, modo: 'cuota' } })
    await user.type(document.getElementById('m-notas') as HTMLElement, ' Cuota #1 ')
    await user.click(within(dialog()).getByRole('button', { name: 'Pagar cuota' }))
    await waitFor(() => expect(acc(f)).toHaveLength(1))
    const m = acc(f)[0]
    expect(m).toMatchObject({ method: 'POST', url: '/api/deuda/1/pago', headers: hdr })
    expect(m?.body).toMatchObject({
      nuevo_saldo: 5600000,
      total_pagado: 500000,
      notas: 'Cuota #1',
      registrar_tx: true,
      modo: 'cuota',
    })
    expect(m?.body).not.toHaveProperty('avanzar_cuota')
    expect(m?.body).not.toHaveProperty('intereses')
    expect(m?.body).not.toHaveProperty('descripcion')
    expect(m?.body).not.toHaveProperty('fecha')
  })

  it('pide el preview siempre: sin saldo nuevo no manda nuevo_saldo y el null del backend oculta el desglose', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/1/pago/preview': conSaldo({ capital: 1, intereses: 1 }) })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Pagar cuota'))
    await waitFor(() => expect(f.callsTo('POST', '/api/deuda/1/pago/preview')).toHaveLength(1))
    expect(f.callsTo('POST', '/api/deuda/1/pago/preview')[0]).toMatchObject({ headers: hdr, body: { total_pagado: 500000, modo: 'cuota' } })
    expect(f.callsTo('POST', '/api/deuda/1/pago/preview')[0]?.body).not.toHaveProperty('nuevo_saldo')
    expect(document.getElementById('pay-breakdown')).not.toHaveClass('visible')
  })

  it('muestra el desglose que devuelve el backend para un saldo fraccionario', async () => {
    const user = userEvent.setup()
    conResumen(resumenCompleto, { 'POST /api/deuda/1/pago': {}, 'POST /api/deuda/1/pago/preview': conSaldo({ capital: 235, intereses: 266 }) })
    renderWithProviders(<Deudas active />, { estado: estado({ deudas: [{ ...credito, saldo_actual: 1234.5, cuota_mensual: 500 }] }) })
    await user.click(await pagar('Pagar cuota'))
    await user.type(document.getElementById('m-saldo-nuevo') as HTMLElement, '1000')
    await waitFor(() => expect(document.getElementById('pay-capital')).toHaveTextContent('$235'))
    expect(document.getElementById('pay-intereses')).toHaveTextContent('$266')
  })

  it('pagar sin registrar_tx', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/1/pago': {}, 'POST /api/deuda/1/pago/preview': conSaldo({ capital: 400000, intereses: 100000 }) })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Pagar cuota'))
    await user.type(document.getElementById('m-saldo-nuevo') as HTMLElement, '5500000')
    await user.click(document.getElementById('m-es-nueva') as HTMLElement)
    await user.click(within(dialog()).getByRole('button', { name: 'Pagar cuota' }))
    await waitFor(() => expect(acc(f)).toHaveLength(1))
    expect(acc(f)[0]?.body).toMatchObject({ registrar_tx: false, modo: 'cuota' })
  })

  it('abono: parte vacío, manda modo abono sin avanzar_cuota', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/1/pago': {}, 'POST /api/deuda/1/pago/preview': conSaldo({ capital: 900000, intereses: 100000 }) })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Abonar'))
    expect(dialog()).toHaveTextContent('Abonar · Crédito carro')
    expect(dialog()).toHaveTextContent('Ingresá cuánto abonaste.')
    expect(document.getElementById('m-monto')).toHaveValue('')
    expect(document.getElementById('m-saldo-nuevo')).toHaveValue('')
    expect(document.getElementById('pay-breakdown')).not.toHaveClass('visible')
    await user.type(document.getElementById('m-monto') as HTMLElement, '1000000')
    await user.type(document.getElementById('m-saldo-nuevo') as HTMLElement, '5000000')
    await waitFor(() => expect(document.getElementById('pay-capital')).toHaveTextContent('900.000'))
    const previews = f.mutations().filter((c) => c.url === '/api/deuda/1/pago/preview')
    expect(previews.at(-1)).toMatchObject({ body: { total_pagado: 1000000, nuevo_saldo: 5000000, modo: 'abono' } })
    await user.click(within(dialog()).getByRole('button', { name: 'Abonar' }))
    await waitFor(() => expect(acc(f)).toHaveLength(1))
    expect(acc(f)[0]).toMatchObject({
      url: '/api/deuda/1/pago',
      body: { nuevo_saldo: 5000000, total_pagado: 1000000, modo: 'abono', registrar_tx: true },
    })
    expect(acc(f)[0]?.body).not.toHaveProperty('avanzar_cuota')
  })

  it('liquidar: prellenado con el saldo completo, modo liquidar', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/1/pago': {}, 'POST /api/deuda/1/pago/preview': conSaldo({ capital: 6000000, intereses: 0 }) })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Liquidar'))
    expect(dialog()).toHaveTextContent('Liquidar · Crédito carro')
    expect(document.getElementById('m-monto')).toHaveValue('6.000.000')
    expect(document.getElementById('m-saldo-nuevo')).toHaveValue('0')
    await waitFor(() => expect(document.getElementById('pay-breakdown')).toHaveClass('visible'))
    expect(document.getElementById('pay-capital')).toHaveTextContent('6.000.000')
    expect(document.getElementById('pay-intereses')).toHaveTextContent('0')
    expect(f.mutations()[0]).toMatchObject({ url: '/api/deuda/1/pago/preview', body: { total_pagado: 6000000, nuevo_saldo: 0, modo: 'liquidar' } })
    await user.click(within(dialog()).getByRole('button', { name: 'Liquidar' }))
    await waitFor(() => expect(acc(f)).toHaveLength(1))
    expect(acc(f)[0]).toMatchObject({
      url: '/api/deuda/1/pago',
      body: { nuevo_saldo: 0, total_pagado: 6000000, modo: 'liquidar', registrar_tx: true },
    })
    expect(acc(f)[0]?.body).not.toHaveProperty('avanzar_cuota')
  })

  it('sin saldo nuevo no valida en el cliente: omite nuevo_saldo y muestra el 422 del backend', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, {
      'POST /api/deuda/1/pago': failure(422, [{ loc: ['body', 'nuevo_saldo'], msg: 'Campo requerido', type: 'missing' }]),
    })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Pagar cuota'))
    await user.click(within(dialog()).getByRole('button', { name: 'Pagar cuota' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('Campo requerido'))
    const m = f.mutations().filter((c) => c.url === '/api/deuda/1/pago')
    expect(m).toHaveLength(1)
    expect(m[0]?.body).not.toHaveProperty('nuevo_saldo')
  })

  it('muestra el 422 en español del backend cuando el monto va vacío', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, {
      'POST /api/deuda/1/pago': failure(422, [{ loc: ['body', 'total_pagado'], msg: 'Debe ser mayor que 0', type: 'greater_than' }]),
    })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Pagar cuota'))
    await user.clear(document.getElementById('m-monto') as HTMLElement)
    await user.type(document.getElementById('m-saldo-nuevo') as HTMLElement, '5600000')
    await user.click(within(dialog()).getByRole('button', { name: 'Pagar cuota' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('Debe ser mayor que 0'))
    expect(f.mutations().filter((c) => c.url === '/api/deuda/1/pago')).toHaveLength(1)
  })

  it('muestra el 400 del backend y no calcula nada en el cliente', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/1/pago': failure(400, 'El saldo después del pago no puede superar el saldo actual') })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Pagar cuota'))
    await user.type(document.getElementById('m-saldo-nuevo') as HTMLElement, '7000000')
    await user.click(within(dialog()).getByRole('button', { name: 'Pagar cuota' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('no puede superar el saldo actual'))
    expect(f.mutations().filter((c) => c.url === '/api/deuda/1/pago')).toHaveLength(1)
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
