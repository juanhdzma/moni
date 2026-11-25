import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { estado } from '@/test/factories'
import { failure } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { Deudas } from '@/features/deudas/index'
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

  it('tarjeta sin cupo: pide saldo después y lo manda', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/2/adelanto': {}, 'POST /api/deuda/2/adelanto/preview': { comision: 50000 } })
    renderWithProviders(<Deudas active />, { estado: estado({ deudas: [{ ...tarjeta, cupo: 0, tiene_cupo: false, frases: { ...tarjeta.frases, disponible_texto: null } }] }) })
    await abrir(user)
    expect(document.getElementById('m-disponible-nuevo')).toBeNull()
    await user.type(document.getElementById('m-monto') as HTMLElement, '100')
    await user.type(document.getElementById('m-saldo-nuevo') as HTMLElement, '1100000')
    await user.click(screen.getByText('Pedir adelanto'))
    await waitFor(() => expect(acc(f)).toHaveLength(1))
    expect(acc(f)[0]?.body).toMatchObject({ monto: 100, nuevo_saldo: 1100000 })
  })

  it('sin saldo ni disponible no valida en el cliente: omite ambos y muestra el 422 del backend', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, {
      'POST /api/deuda/2/adelanto': failure(422, 'nuevo_saldo o disponible_nuevo requerido'),
    })
    renderWithProviders(<Deudas active />, { estado: full() })
    await abrir(user)
    await user.type(document.getElementById('m-monto') as HTMLElement, '100')
    await user.click(screen.getByText('Pedir adelanto'))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('requerido'))
    const m = f.mutations().filter((c) => c.url === '/api/deuda/2/adelanto')[0]
    expect(m?.body).not.toHaveProperty('nuevo_saldo')
    expect(m?.body).not.toHaveProperty('disponible_nuevo')
  })

  it('muestra el 422 en español del backend cuando el monto va vacío', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, {
      'POST /api/deuda/2/adelanto': failure(422, [{ loc: ['body', 'monto'], msg: 'Debe ser mayor que 0', type: 'greater_than' }]),
    })
    renderWithProviders(<Deudas active />, { estado: full() })
    await abrir(user)
    await user.type(document.getElementById('m-disponible-nuevo') as HTMLElement, '3450000')
    await user.click(screen.getByText('Pedir adelanto'))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('Debe ser mayor que 0'))
    expect(f.mutations().filter((c) => c.url === '/api/deuda/2/adelanto')).toHaveLength(1)
  })

  it('pide el preview apenas hay saldo escrito, sin exigir monto: el backend decide', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/2/adelanto/preview': { comision: 0, nuevo_saldo: 1000000 } })
    renderWithProviders(<Deudas active />, { estado: full() })
    await abrir(user)
    await user.type(document.getElementById('m-disponible-nuevo') as HTMLElement, '3450000')
    await waitFor(() => expect(f.callsTo('POST', '/api/deuda/2/adelanto/preview')).toHaveLength(1))
    expect(f.callsTo('POST', '/api/deuda/2/adelanto/preview')[0]).toMatchObject({ headers: hdr, body: { monto: 0, disponible_nuevo: 3450000 } })
  })
})
