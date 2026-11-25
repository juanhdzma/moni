import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { failure, mockFetch } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { Deudas } from '@/features/deudas/index'
import { conResumen, dialog, full, hdr, resumenCompleto, installFakeDate } from './fixtures'

installFakeDate()

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
        clase_deuda: 'prestamo',
        cupo: 0,
        franquicia: 'Visa',
        crear_tx: true,
      },
    })
    await waitFor(() => expect(f.callsTo('GET', '/api/deudas/resumen').length).toBeGreaterThan(1))
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
        clase_deuda: 'tarjeta',
        cupo: 3000000,
        franquicia: 'Visa',
        crear_tx: true,
      },
    })
  })

  it('no valida reglas de negocio: manda el payload y muestra el 422 del backend', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/deuda': failure(422, 'Saldo requerido') })
    renderWithProviders(<Deudas active />)
    await user.click(screen.getByText('Nueva deuda'))
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'X')
    await user.click(screen.getByText('Agregar deuda'))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('Saldo requerido'))
    expect(document.getElementById('m-status')).toHaveClass('err')
    expect(f.mutations()).toHaveLength(1)
    expect(f.mutations()[0]?.body).toMatchObject({ nombre: 'X', saldo_actual: 0, clase_deuda: 'prestamo' })
    expect(f.mutations()[0]?.body).not.toHaveProperty('es_tarjeta')
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

  it('editar: PUT sin crear_tx ni id en el body', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'PUT /api/deuda/1': {} })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await within(document.getElementById('deudas-grid-credito') as HTMLElement).findByText('Editar'))
    expect(f.callsTo('GET', '/api/deuda/1')).toHaveLength(1)
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
        clase_deuda: 'prestamo',
        cupo: 0,
        franquicia: 'Visa',
      },
    })
    expect(m?.body).not.toHaveProperty('crear_tx')
    expect(m?.body).not.toHaveProperty('id')
  })

  it('eliminar: confirm y DELETE', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'DELETE /api/deuda/1': {} })
    renderWithProviders(<Deudas active />, { estado: full() })
    await user.click(await within(document.getElementById('deudas-grid-credito') as HTMLElement).findByText('Editar'))
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('¿Eliminar "Crédito carro"?')
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'DELETE', url: '/api/deuda/1', headers: { 'X-Moni-Request': '1' } })
  })

  it('eliminar: sin confirmar no envía; error va al banner', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'DELETE /api/deuda/1': failure(500, 'nope') })
    renderWithProviders(<Deudas active />, { estado: full() })
    const editar = async () => user.click(await within(document.getElementById('deudas-grid-credito') as HTMLElement).findByText('Editar'))
    await editar()
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(f.mutations()).toHaveLength(0)
    await editar()
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    await waitFor(() => expect(f.callsTo('GET', '/api/deudas/resumen').length).toBeGreaterThan(1))
  })
  it('ofrece tasa MV: muestra la equivalencia y manda tasa_tipo solo cuando no es el default', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, {
      'POST /api/deuda': {},
      'GET /api/calc/tasa': { texto: 'Equivale a 289,60% EA' },
    })
    renderWithProviders(<Deudas active />)
    await user.click(screen.getByText('Nueva deuda'))
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'Libre')
    await user.type(document.getElementById('m-saldo') as HTMLElement, '100')
    await user.type(document.getElementById('m-tasa') as HTMLElement, '2')
    await user.click(within(dialog()).getByRole('button', { name: 'MV' }))
    await waitFor(() => expect(document.getElementById('tasa-equiv')).toHaveTextContent('Equivale a 289,60% EA'))
    expect(f.callsTo('GET', '/api/calc/tasa?valor=2&tipo=mv')).toHaveLength(1)
    await user.click(screen.getByText('Agregar deuda'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ tasa_ea: 2, tasa_tipo: 'mv' })
  })

  it('con la tasa en EA no manda tasa_tipo', async () => {
    const user = userEvent.setup()
    const f = conResumen(resumenCompleto, { 'POST /api/deuda': {} })
    renderWithProviders(<Deudas active />)
    await user.click(screen.getByText('Nueva deuda'))
    await user.type(document.getElementById('m-saldo') as HTMLElement, '100')
    await user.type(document.getElementById('m-tasa') as HTMLElement, '24')
    await user.click(screen.getByText('Agregar deuda'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).not.toHaveProperty('tasa_tipo')
  })
})
