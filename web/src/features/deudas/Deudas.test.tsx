import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deuda, estado } from '../../test/factories'
import { failure, mockFetch } from '../../test/mockFetch'
import { renderWithProviders } from '../../test/render'
import { expectLabels, modalBody } from '../../test/labels'
import { Deudas } from './index'

const credito = deuda({
  _id: 1,
  id: 1,
  nombre: 'Crédito carro',
  monto_inicial: 10000000,
  saldo_actual: 6000000,
  tasa_ea: 20,
  cuota_mensual: 500000,
  proxima_cuota: '2026-09-05',
  total_intereses: 800000,
  activa: true,
  vigente: true,
  progreso_pct: 40,
  capital_pagado: 4000000,
  meses_restantes: 12,
  nivel_progreso: 'medio',
  intereses_pagados: { valor: 800000, exacto: true },
})
const tarjeta = deuda({
  _id: 2,
  id: 2,
  nombre: 'Visa Oro',
  es_tarjeta: 1,
  cupo: 5000000,
  saldo_actual: 1000000,
  franquicia: 'Visa',
  total_intereses: 12000,
  activa: true,
  vigente: true,
  disponible: 4000000,
  uso_pct: 20,
  nivel_uso: 'bajo',
  intereses_pagados: { valor: 12000, exacto: true },
})
const saldado = deuda({
  _id: 3,
  id: 3,
  nombre: 'Moto',
  monto_inicial: 3000000,
  saldo_actual: 0,
  tasa_ea: 18,
  cuota_mensual: 200000,
  total_intereses: 150000,
  progreso_pct: 100,
  capital_pagado: 3000000,
  nivel_progreso: 'alto',
  intereses_pagados: { valor: 150000, exacto: true },
})

const full = () => estado({ deudas: [credito, tarjeta, saldado] })

const resumenCompleto = {
  total: 7000000,
  total_cuotas: 500000,
  total_intereses: 962000,
  intereses_aproximado: false,
  segmentos: [
    { key: '1', label: 'Crédito carro', valor: 6000000 },
    { key: '2', label: 'Visa Oro', valor: 1000000 },
  ],
  creditos: [credito],
  tarjetas: [tarjeta],
  terminadas: [saldado],
}

const conResumen = (r: unknown = resumenCompleto, extra: Record<string, unknown> = {}) =>
  mockFetch({ 'GET /api/deudas/resumen': r, ...extra })

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 8, 5, 10, 30) }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const dialog = () => document.getElementById('modal-overlay') as HTMLElement
const hdr = { 'X-Moni-Request': '1', 'Content-Type': 'application/json' }

describe('Deudas render', () => {
  it('pide el resumen al backend y muestra totales, créditos, tarjetas y terminados', async () => {
    const f = conResumen()
    renderWithProviders(<Deudas active />, { estado: full() })
    const cred = document.getElementById('deudas-grid-credito') as HTMLElement
    expect(await within(cred).findByText('Crédito carro')).toBeInTheDocument()
    expect(f.callsTo('GET', '/api/deudas/resumen')).toHaveLength(1)
    const total = document.getElementById('deudas-total') as HTMLElement
    expect(within(total).getByText('Lo que debés')).toBeInTheDocument()
    expect(total).toHaveTextContent('$7.000.000')
    expect(total).toHaveTextContent('$500.000/mes en cuotas')
    expect(total).toHaveTextContent('$962.000 pagados en intereses')
    expect(total.textContent).not.toMatch(/~/)
    expect(within(total).getByRole('list', { name: 'De qué está hecho' })).toHaveTextContent('Crédito carro')
    expect(within(cred).getByText('~12m')).toBeInTheDocument()
    expect(within(cred).getByText('40,0% pagado')).toBeInTheDocument()
    expect(within(cred).getByText('$4.000.000')).toBeInTheDocument()
    expect(within(cred).getByTitle('Suma de los pagos registrados en Moni')).toBeInTheDocument()
    expect(within(cred).getByText('Próxima cuota:')).toBeInTheDocument()
    const tar = document.getElementById('deudas-grid-tarjeta') as HTMLElement
    expect(within(tar).getByText('Visa Oro')).toBeInTheDocument()
    expect(within(tar).getByText(/Disponible:/)).toHaveTextContent('$4.000.000')
    expect(within(tar).getByText(/Intereses pagados:/)).toBeInTheDocument()
    expect(within(tar).getByAltText('Visa')).toHaveAttribute('src', 'assets/franquicias/visa.svg')
    const term = document.getElementById('deudas-terminados') as HTMLElement
    expect(within(term).getByText('Préstamos terminados')).toBeInTheDocument()
    expect(within(term).getByText('Saldado')).toBeInTheDocument()
    expect(within(term).getByText(/en intereses/)).toBeInTheDocument()
  })

  it('el color de las barras sale del nivel que manda el backend', async () => {
    conResumen({
      ...resumenCompleto,
      creditos: [{ ...credito, nivel_progreso: 'alto' }],
      tarjetas: [{ ...tarjeta, uso_pct: 95, nivel_uso: 'alto' }],
    })
    renderWithProviders(<Deudas active />, { estado: full() })
    await within(document.getElementById('deudas-grid-credito') as HTMLElement).findByText('Crédito carro')
    const barraCred = document.querySelector('#deudas-grid-credito [aria-hidden="true"] > span')
    const barraTar = document.querySelector('#deudas-grid-tarjeta [aria-hidden="true"] > span')
    expect(barraCred).toHaveClass('bg-inversiones')
    expect(barraTar).toHaveClass('bg-deudas')
  })

  it('antepone ~ cuando el backend marca los intereses como aproximados', async () => {
    conResumen({
      ...resumenCompleto,
      total_intereses: 420000,
      intereses_aproximado: true,
      creditos: [{ ...credito, total_intereses: 0, intereses_pagados: { valor: 420000, exacto: false } }],
      tarjetas: [],
      terminadas: [],
    })
    renderWithProviders(<Deudas active />, { estado: full() })
    const cred = document.getElementById('deudas-grid-credito') as HTMLElement
    const intereses = await within(cred).findByTitle(/Estimado por amortización/)
    expect(intereses).toHaveTextContent('~$420.000')
    expect(document.getElementById('deudas-total')).toHaveTextContent('~$420.000 pagados en intereses')
  })

  it('empty states', async () => {
    const f = conResumen({ ...resumenCompleto, total: 0, total_cuotas: 0, total_intereses: 0, segmentos: [], creditos: [], tarjetas: [], terminadas: [] })
    renderWithProviders(<Deudas active />)
    expect(await screen.findByText('Sin créditos')).toBeInTheDocument()
    expect(f.callsTo('GET', '/api/deudas/resumen')).toHaveLength(1)
    expect(screen.getByText('Agregá uno con el botón + de arriba.')).toBeInTheDocument()
    expect(screen.getByText('Sin tarjetas')).toBeInTheDocument()
    expect(document.getElementById('deudas-terminados')?.children).toHaveLength(0)
    expect(document.getElementById('deudas-total')).not.toHaveTextContent('pagados en intereses')
  })

  it('sin créditos activos pero con saldados', async () => {
    conResumen({ ...resumenCompleto, creditos: [], tarjetas: [], total: 0, segmentos: [] })
    renderWithProviders(<Deudas active />, { estado: estado({ deudas: [saldado] }) })
    expect(await screen.findByText('Sin créditos activos')).toBeInTheDocument()
    expect(screen.getByText('¡Todos los créditos están saldados!')).toBeInTheDocument()
  })

  it('tarjeta sin cupo', async () => {
    conResumen({
      ...resumenCompleto,
      tarjetas: [{ ...tarjeta, saldo_actual: 0, cupo: 0, total_intereses: 0, disponible: null, uso_pct: 0, intereses_pagados: null }],
    })
    renderWithProviders(<Deudas active />, { estado: full() })
    expect(await screen.findByText('Sin cupo definido')).toBeInTheDocument()
    expect(screen.queryByText(/Disponible:/)).toBeNull()
  })

  it('los botones de las cards son alcanzables por teclado', async () => {
    const user = userEvent.setup()
    conResumen()
    renderWithProviders(<Deudas active />, { estado: full() })
    await within(document.getElementById('deudas-grid-credito') as HTMLElement).findByText('Crédito carro')
    const btn = screen.getAllByRole('button', { name: 'Editar' })[0] as HTMLElement
    btn.focus()
    expect(btn).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(dialog()).toHaveTextContent('Editar deuda')
  })
})

describe('forms', () => {
  it('crear crédito con crear_tx', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/deuda': {} })
    renderWithProviders(<Deudas active />)
    await user.click(screen.getByText('Nueva deuda'))
    await user.type(document.getElementById('m-nombre') as HTMLElement, '  Libre  ')
    await user.type(document.getElementById('m-monto-ini') as HTMLElement, '2000000')
    await user.type(document.getElementById('m-saldo') as HTMLElement, '1500000')
    await user.type(document.getElementById('m-tasa') as HTMLElement, '24.5')
    await user.type(document.getElementById('m-cuota') as HTMLElement, '100000')
    await user.click(screen.getByText('Agregar deuda'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST',
      url: '/api/deuda',
      headers: hdr,
      body: {
        nombre: 'Libre',
        monto_inicial: 2000000,
        saldo_actual: 1500000,
        tasa_ea: 24.5,
        cuota_mensual: 100000,
        fecha_inicio: '',
        proxima_cuota: '',
        es_tarjeta: false,
        cupo: 0,
        franquicia: '',
        crear_tx: true,
      },
    })
    await waitFor(() => expect(f.callsTo('GET', '/api/all')).toHaveLength(1))
  })

  it('crear crédito con crear_tx desactivado', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/deuda': {} })
    renderWithProviders(<Deudas active />)
    await user.click(screen.getByText('Nueva deuda'))
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'X')
    await user.type(document.getElementById('m-saldo') as HTMLElement, '100')
    await user.click(document.getElementById('m-es-nueva') as HTMLElement)
    await user.click(screen.getByText('Agregar deuda'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ crear_tx: false })
  })

  it('crear tarjeta', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/deuda': {} })
    renderWithProviders(<Deudas active />)
    await user.click(screen.getByText('Nueva deuda'))
    await user.click(screen.getByRole('button', { name: 'Tarjeta' }))
    expect(screen.getByText('Deuda actual (COP)')).toBeInTheDocument()
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'Visa')
    await user.type(document.getElementById('m-cupo') as HTMLElement, '3000000')
    await user.click(screen.getByText('Agregar deuda'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST',
      url: '/api/deuda',
      headers: hdr,
      body: {
        nombre: 'Visa',
        monto_inicial: 0,
        saldo_actual: 0,
        tasa_ea: 0,
        cuota_mensual: 0,
        fecha_inicio: '',
        proxima_cuota: '',
        es_tarjeta: true,
        cupo: 3000000,
        franquicia: 'Visa',
        crear_tx: false,
      },
    })
  })

  it('validación: nombre y saldo requeridos', async () => {
    const user = userEvent.setup()
    const f = mockFetch()
    renderWithProviders(<Deudas active />)
    await user.click(screen.getByText('Nueva deuda'))
    await user.click(screen.getByText('Agregar deuda'))
    expect(document.getElementById('m-status')).toHaveTextContent('Nombre requerido')
    expect(document.getElementById('m-status')).toHaveClass('err')
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'X')
    await user.click(screen.getByText('Agregar deuda'))
    expect(document.getElementById('m-status')).toHaveTextContent('Saldo requerido')
    expect(f.mutations()).toHaveLength(0)
  })

  it('error del backend se muestra en el modal', async () => {
    const user = userEvent.setup()
    mockFetch({ 'POST /api/deuda': failure(422, 'boom') })
    renderWithProviders(<Deudas active />)
    await user.click(screen.getByText('Nueva deuda'))
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'X')
    await user.type(document.getElementById('m-saldo') as HTMLElement, '5')
    await user.click(screen.getByText('Agregar deuda'))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('boom'))
    expect(document.getElementById('m-status')).toHaveClass('err')
  })

  it('editar: PUT sin crear_tx ni _id en el body', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'PUT /api/deuda/1': {} })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await within(document.getElementById('deudas-grid-credito') as HTMLElement).findByText('Editar'))
    expect(document.getElementById('m-nombre')).toHaveValue('Crédito carro')
    expect(document.getElementById('m-saldo')).toHaveValue('6.000.000')
    expect(document.getElementById('m-es-nueva')).toBeNull()
    await user.click(screen.getByText('Guardar cambios'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    const m = f.mutations()[0]
    expect(m).toMatchObject({
      method: 'PUT',
      url: '/api/deuda/1',
      headers: hdr,
      body: {
        nombre: 'Crédito carro',
        monto_inicial: 10000000,
        saldo_actual: 6000000,
        tasa_ea: 20,
        cuota_mensual: 500000,
        fecha_inicio: '',
        proxima_cuota: '2026-09-05',
        es_tarjeta: false,
        cupo: 0,
        franquicia: '',
      },
    })
    expect(m?.body).not.toHaveProperty('crear_tx')
    expect(m?.body).not.toHaveProperty('_id')
  })

  it('eliminar: confirm y DELETE', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'DELETE /api/deuda/1': {} })
    const conf = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await within(document.getElementById('deudas-grid-credito') as HTMLElement).findByText('Editar'))
    await user.click(screen.getByText('Eliminar'))
    expect(conf).toHaveBeenCalledWith('¿Eliminar "Crédito carro"?')
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'DELETE', url: '/api/deuda/1', headers: { 'X-Moni-Request': '1' } })
    conf.mockRestore()
  })

  it('eliminar: sin confirmar no envía; error va al banner', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'DELETE /api/deuda/1': failure(500, 'nope') })
    const conf = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await within(document.getElementById('deudas-grid-credito') as HTMLElement).findByText('Editar'))
    await user.click(screen.getByText('Eliminar'))
    expect(f.mutations()).toHaveLength(0)
    conf.mockReturnValue(true)
    await user.click(screen.getByText('Eliminar'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    await waitFor(() => expect(f.callsTo('GET', '/api/all')).toHaveLength(1))
    conf.mockRestore()
  })
})

const acc = (f: ReturnType<typeof mockFetch>) => f.mutations().filter((c) => !c.url.endsWith('/preview'))

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

describe('adelanto', () => {
  const abrir = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(await within(document.getElementById('deudas-grid-tarjeta') as HTMLElement).findByText('Adelanto'))

  it('tarjeta con cupo: deriva saldo desde disponible', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda/2/adelanto': {}, 'POST /api/deuda/2/adelanto/preview': { comision: 50000 } })
    renderWithProviders(<Deudas active />, { estado: full() })
    await abrir(user)
    expect(dialog()).toHaveTextContent('Pedir adelanto · Visa Oro')
    await user.type(document.getElementById('m-monto') as HTMLElement, '500000')
    await user.type(document.getElementById('m-disponible-nuevo') as HTMLElement, '3450000')
    expect(document.getElementById('adelanto-deuda')).toHaveTextContent('1.550.000')
    await waitFor(() => expect(document.getElementById('adelanto-comision')).toHaveTextContent('50.000'))
    expect(document.getElementById('adelanto-comision-row')).toHaveStyle({ display: 'flex' })
    const previews = f.mutations().filter((c) => c.url === '/api/deuda/2/adelanto/preview')
    expect(previews.at(-1)).toMatchObject({ method: 'POST', headers: hdr, body: { monto: 500000, nuevo_saldo: 1550000 } })
    await user.click(screen.getByText('Pedir adelanto'))
    await waitFor(() => expect(acc(f)).toHaveLength(1))
    const m = acc(f)[0]
    expect(m).toMatchObject({ method: 'POST', url: '/api/deuda/2/adelanto', headers: hdr })
    expect(m?.body).toMatchObject({
      monto: 500000,
      nuevo_saldo: 1550000,
      notas: '',
      descripcion: 'Adelanto · Visa Oro',
      registrar_tx: true,
    })
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
      'Cupo (COP)': 'm-cupo',
      Franquicia: 'm-franquicia',
      'Saldo actual (COP)': 'm-saldo',
      'Tasa EA (%)': 'm-tasa',
      'Cuota mensual': 'm-cuota',
      'Fecha inicio': 'm-fecha-ini',
      'Próxima cuota': 'm-proxima',
    })
    expect(within(modalBody()).getByRole('group', { name: 'Tipo' })).toBeInTheDocument()
  })

  it('el form de pago se encuentra por sus labels', async () => {
    conResumen()
    const user = userEvent.setup()
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await pagar('Pagar cuota'))
    expectLabels(modalBody(), {
      'Monto total pagado (COP)': 'm-monto',
      'Saldo capital después del pago': 'm-saldo-nuevo',
      'Fecha del pago': 'm-fecha',
      'Notas (opcional)': 'm-notas',
    })
  })
})
