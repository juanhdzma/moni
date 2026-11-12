import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { estado, inversion } from '../../test/factories'
import { failure, mockFetch } from '../../test/mockFetch'
import { renderWithProviders } from '../../test/render'
import { Inversiones } from './index'

const CDT = inversion({
  _id: 5,
  id: 5,
  nombre: 'CDT Uno',
  tipo: 'fija',
  monto_invertido: 1_000_000,
  valor_actual: 1_010_000,
  tasa_ea: 12,
  fecha_inicio: '2026-01-10',
  pago: 'vencimiento',
  dia_pago: null,
  valor_actualizado_en: '2026-11-01',
})
const FONDO = inversion({
  _id: 6,
  id: 6,
  nombre: 'Fondo X',
  tipo: 'variable',
  monto_invertido: 500_000,
  valor_actual: 450_000,
  fecha_inicio: '2026-02-01',
  valor_actualizado_en: '2026-08-01',
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 12, 10, 30) })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const setup = (invs = [CDT, FONDO]) => renderWithProviders(<Inversiones active />, { estado: estado({ inversiones: invs }) })
const modal = () => within(document.getElementById('modal-overlay') as HTMLElement)
const H = { 'X-Moni-Request': '1' }

async function typeMoney(user: ReturnType<typeof userEvent.setup>, id: string, text: string) {
  const el = document.getElementById(id) as HTMLInputElement
  await user.clear(el)
  await user.type(el, text)
}

describe('render', () => {
  it('resumen y tarjetas', () => {
    setup()
    const total = document.getElementById('inv-total') as HTMLElement
    expect(total).toHaveTextContent('2 posiciones')
    expect(total).toHaveTextContent('capital')
    const fija = document.getElementById('inv-grid-fija') as HTMLElement
    expect(within(fija).getByText('CDT Uno')).toBeInTheDocument()
    expect(fija).toHaveTextContent('12,00% EA')
    expect(fija).toHaveTextContent('Desde')
    expect(within(fija).getByRole('button', { name: 'Rendimiento' })).toBeInTheDocument()
    const variable = document.getElementById('inv-grid-variable') as HTMLElement
    expect(within(variable).getByRole('button', { name: 'Actualizar' })).toBeInTheDocument()
    expect(variable).toHaveTextContent('⚠ Valor sin actualizar hace más de 1 mes')
    expect(fija).not.toHaveTextContent('Valor sin actualizar')
  })

  it('próximo pago de una mensual', () => {
    setup([{ ...CDT, pago: 'mensual', dia_pago: 15 }])
    expect(document.getElementById('inv-grid-fija')).toHaveTextContent('en 3d')
  })

  it('estados vacíos', () => {
    setup([])
    expect(screen.getByText('Sin inversiones fijas')).toBeInTheDocument()
    expect(screen.getByText('Sin inversiones variables')).toBeInTheDocument()
    expect(document.getElementById('inv-total')).toHaveTextContent('0 posiciones')
  })

  it('botones accesibles por teclado', async () => {
    const user = userEvent.setup()
    setup()
    const fija = document.getElementById('inv-grid-fija') as HTMLElement
    const btn = within(fija).getByRole('button', { name: 'Editar' })
    btn.focus()
    await user.keyboard('{Enter}')
    expect(modal().getByText('Editar inversión')).toBeInTheDocument()
  })
})

describe('crear / editar / eliminar', () => {
  it('crear fija mensual con crear_tx', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/inv': {} })
    setup([])
    await user.click(screen.getByRole('button', { name: '+ Nueva inversión' }))
    await user.type(document.getElementById('m-nombre') as HTMLElement, '  CDT Nuevo ')
    await typeMoney(user, 'm-invertido', '2000000')
    await user.type(document.getElementById('m-tasa') as HTMLElement, '12')
    expect(document.getElementById('tasa-equiv')).toHaveTextContent('Equivale a 0,9489% MV')
    await user.click(modal().getByRole('button', { name: 'MV' }))
    expect(document.getElementById('tasa-equiv')).toHaveTextContent('Equivale a 289,60% EA')
    await user.click(modal().getByRole('button', { name: 'EA' }))
    await user.click(document.getElementById('rp-mensual') as HTMLElement)
    await user.type(document.getElementById('m-dia-pago') as HTMLElement, '15')
    await user.click(modal().getByRole('button', { name: 'Agregar inversión' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST',
      url: '/api/inv',
      headers: H,
      body: {
        nombre: 'CDT Nuevo',
        tipo: 'fija',
        monto_invertido: 2000000,
        valor_actual: 2000000,
        tasa_ea: 12,
        fecha_inicio: '2026-11-12',
        pago: 'mensual',
        dia_pago: 15,
        valor_actualizado_en: '2026-11-12',
        crear_tx: true,
      },
    })
  })

  it('crear variable sin tasa/pago y con crear_tx false', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/inv': {} })
    setup([])
    await user.click(screen.getByRole('button', { name: '+ Nueva inversión' }))
    await user.click(modal().getByRole('button', { name: 'Variable' }))
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'ETF')
    await typeMoney(user, 'm-invertido', '100000')
    await typeMoney(user, 'm-actual', '120000')
    await user.click(modal().getByText('Opciones de registro'))
    await user.click(modal().getByLabelText('Registrar como nuevo en transacciones'))
    await user.click(modal().getByRole('button', { name: 'Agregar inversión' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toEqual({
      nombre: 'ETF',
      tipo: 'variable',
      monto_invertido: 100000,
      valor_actual: 120000,
      tasa_ea: null,
      fecha_inicio: '2026-11-12',
      pago: null,
      dia_pago: null,
      valor_actualizado_en: '2026-11-12',
      crear_tx: false,
    })
  })

  it('validación: nombre y monto', async () => {
    const user = userEvent.setup()
    const f = mockFetch()
    setup([])
    await user.click(screen.getByRole('button', { name: '+ Nueva inversión' }))
    await user.click(modal().getByRole('button', { name: 'Agregar inversión' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Nombre requerido')
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'X')
    await user.click(modal().getByRole('button', { name: 'Agregar inversión' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Monto invertido requerido')
    expect(f.mutations()).toHaveLength(0)
  })

  it('editar: PUT sin crear_tx y valor_actualizado_en conservado', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'PUT /api/inv/5': {} })
    setup()
    await user.click(within(document.getElementById('inv-grid-fija') as HTMLElement).getByRole('button', { name: 'Editar' }))
    expect(modal().queryByText('Opciones de registro')).toBeNull()
    expect(document.getElementById('m-tasa')).toHaveValue(12)
    await user.clear(document.getElementById('m-nombre') as HTMLElement)
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'CDT Dos')
    await user.click(modal().getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'PUT', url: '/api/inv/5', headers: H })
    expect(f.mutations()[0]?.body).toEqual({
      nombre: 'CDT Dos',
      tipo: 'fija',
      monto_invertido: 1000000,
      valor_actual: 1010000,
      tasa_ea: 12,
      fecha_inicio: '2026-01-10',
      pago: 'vencimiento',
      dia_pago: null,
      valor_actualizado_en: '2026-11-01',
    })
  })

  it('editar cambiando el valor actual usa la fecha de hoy', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'PUT /api/inv/5': {} })
    setup()
    await user.click(within(document.getElementById('inv-grid-fija') as HTMLElement).getByRole('button', { name: 'Editar' }))
    await typeMoney(user, 'm-actual', '1100000')
    await user.click(modal().getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ valor_actual: 1100000, valor_actualizado_en: '2026-11-12' })
  })

  it('eliminar: confirm y DELETE', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'DELETE /api/inv/5': {} })
    const confirmFn = vi.fn(() => true)
    vi.stubGlobal('confirm', confirmFn)
    setup()
    await user.click(within(document.getElementById('inv-grid-fija') as HTMLElement).getByRole('button', { name: 'Editar' }))
    await user.click(modal().getByRole('button', { name: 'Eliminar' }))
    expect(confirmFn).toHaveBeenCalledWith('¿Eliminar "CDT Uno"?')
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'DELETE', url: '/api/inv/5', headers: H })
  })

  it('eliminar cancelado no envía nada', async () => {
    const user = userEvent.setup()
    const f = mockFetch()
    vi.stubGlobal('confirm', () => false)
    setup()
    await user.click(within(document.getElementById('inv-grid-fija') as HTMLElement).getByRole('button', { name: 'Editar' }))
    await user.click(modal().getByRole('button', { name: 'Eliminar' }))
    expect(f.mutations()).toHaveLength(0)
  })

  it('error del backend se muestra en el modal', async () => {
    const user = userEvent.setup()
    mockFetch({ 'POST /api/inv': failure(422, [{ msg: 'malo' }, { msg: 'peor' }]) })
    setup([])
    await user.click(screen.getByRole('button', { name: '+ Nueva inversión' }))
    await user.type(document.getElementById('m-nombre') as HTMLElement, 'X')
    await typeMoney(user, 'm-invertido', '10')
    await user.click(modal().getByRole('button', { name: 'Agregar inversión' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveClass('err'))
    expect(document.getElementById('m-status')).toHaveTextContent('❌ malo, peor')
  })
})

describe('rendimiento', () => {
  const abrir = async (user: ReturnType<typeof userEvent.setup>, inv = CDT) => {
    setup([inv])
    await user.click(screen.getByRole('button', { name: 'Rendimiento' }))
  }

  it('CDT al vencimiento capitaliza por defecto y oculta registrar en transacciones', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/inv/5/rendimiento': {} })
    await abrir(user)
    expect(document.getElementById('m-monto')).toHaveValue('9.584')
    expect(document.getElementById('rend-hint')).toHaveTextContent('Sube el valor de la inversión. No entra plata a tu cartera.')
    expect(document.getElementById('wrap-rend-advanced')).toHaveStyle({ display: 'none' })
    await user.type(document.getElementById('m-notas') as HTMLElement, ' nota ')
    await user.click(modal().getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST',
      url: '/api/inv/5/rendimiento',
      headers: H,
      body: { monto: 9584, fecha: '2026-11-12T10:30', notas: 'nota', capitaliza: true, registrar_tx: false },
    })
  })

  it('me lo pagan: capitaliza false y registrar_tx true; destildado manda false', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/inv/5/rendimiento': {} })
    await abrir(user)
    await user.click(document.getElementById('rend-cuenta') as HTMLElement)
    expect(document.getElementById('rend-hint')).toHaveTextContent('Entra como ingreso a tu cartera. El valor de la inversión no cambia.')
    expect(document.getElementById('wrap-rend-advanced')).not.toHaveStyle({ display: 'none' })
    await user.click(modal().getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ capitaliza: false, registrar_tx: true })
  })

  it('me lo pagan sin registrar en transacciones', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/inv/5/rendimiento': {} })
    await abrir(user, { ...CDT, pago: 'mensual', dia_pago: 15 })
    expect(document.getElementById('rend-hint')).toHaveTextContent('Entra como ingreso')
    await user.click(modal().getByText('Opciones de registro'))
    await user.click(modal().getByLabelText('Registrar en transacciones'))
    await user.click(modal().getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ capitaliza: false, registrar_tx: false })
  })

  it('monto inválido y error del backend', async () => {
    const user = userEvent.setup()
    mockFetch({ 'POST /api/inv/5/rendimiento': failure(400, 'rechazado') })
    await abrir(user)
    await typeMoney(user, 'm-monto', '0')
    await user.click(modal().getByRole('button', { name: 'Registrar' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Ingresá un monto válido')
    await typeMoney(user, 'm-monto', '500')
    await user.click(modal().getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('❌ rechazado'))
    expect(document.getElementById('m-status')).toHaveClass('err')
  })

  it('Editar inversión cierra y abre el form de edición', async () => {
    const user = userEvent.setup()
    mockFetch()
    await abrir(user)
    await user.click(modal().getByRole('button', { name: 'Editar inversión' }))
    await waitFor(() => expect(modal().getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument())
  })
})

describe('actualizar valor (variable)', () => {
  it('preview y PUT con el objeto completo', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'PUT /api/inv/6': {} })
    setup()
    await user.click(within(document.getElementById('inv-grid-variable') as HTMLElement).getByRole('button', { name: 'Actualizar' }))
    expect(document.getElementById('inv-value-preview')).toHaveStyle({ display: 'none' })
    await typeMoney(user, 'm-nuevo-valor', '600000')
    expect(document.getElementById('inv-delta')).toHaveTextContent('+$150.000')
    expect(document.getElementById('inv-total-gain')).toHaveTextContent('+$100.000 (+20,0%)')
    await user.click(modal().getByRole('button', { name: 'Actualizar' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'PUT', url: '/api/inv/6', headers: H })
    expect(f.mutations()[0]?.body).toEqual({
      id: 6,
      nombre: 'Fondo X',
      tipo: 'variable',
      monto_invertido: 500000,
      valor_actual: 600000,
      tasa_ea: null,
      fecha_inicio: '2026-02-01',
      pago: null,
      dia_pago: null,
      valor_actualizado_en: '2026-11-12T10:30',
    })
  })

  it('valor inválido', async () => {
    const user = userEvent.setup()
    const f = mockFetch()
    setup()
    await user.click(within(document.getElementById('inv-grid-variable') as HTMLElement).getByRole('button', { name: 'Actualizar' }))
    await user.click(modal().getByRole('button', { name: 'Actualizar' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Valor inválido')
    expect(f.mutations()).toHaveLength(0)
  })
})

describe('aporte', () => {
  it('usa valor actual + aporte si no se da nuevo valor', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/inv/6/aporte': {} })
    setup()
    await user.click(within(document.getElementById('inv-grid-variable') as HTMLElement).getByRole('button', { name: '+ Más' }))
    await typeMoney(user, 'm-monto', '50000')
    expect(document.getElementById('add-more-hint')).toHaveTextContent('Estimado: $500.000. Ajustá si el mercado se movió.')
    expect(document.getElementById('m-nuevo-valor')).toHaveAttribute('placeholder', '500.000')
    await user.click(modal().getByRole('button', { name: 'Agregar aporte' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST',
      url: '/api/inv/6/aporte',
      headers: H,
      body: { monto: 50000, nuevo_valor: 500000, fecha: '2026-11-12T10:30', notas: '', registrar_tx: true },
    })
  })

  it('nuevo valor explícito, notas y sin registrar', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/inv/6/aporte': {} })
    setup()
    await user.click(within(document.getElementById('inv-grid-variable') as HTMLElement).getByRole('button', { name: '+ Más' }))
    await typeMoney(user, 'm-monto', '50000')
    await typeMoney(user, 'm-nuevo-valor', '520000')
    await user.type(document.getElementById('m-notas') as HTMLElement, 'mensual')
    await user.click(modal().getByText('Opciones de registro'))
    await user.click(modal().getByLabelText('Registrar en transacciones'))
    await user.click(modal().getByRole('button', { name: 'Agregar aporte' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toMatchObject({ monto: 50000, nuevo_valor: 520000, notas: 'mensual', registrar_tx: false })
  })

  it('monto requerido', async () => {
    const user = userEvent.setup()
    const f = mockFetch()
    setup()
    await user.click(within(document.getElementById('inv-grid-variable') as HTMLElement).getByRole('button', { name: '+ Más' }))
    await user.click(modal().getByRole('button', { name: 'Agregar aporte' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Ingresá el monto que agregas')
    expect(f.mutations()).toHaveLength(0)
  })
})

describe('retiro', () => {
  const abrir = async (user: ReturnType<typeof userEvent.setup>) => {
    setup()
    await user.click(
      within(document.getElementById('inv-grid-fija') as HTMLElement).getByRole('button', { name: 'Retirar' }),
    )
  }

  it('total', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/inv/5/retiro': {} })
    await abrir(user)
    expect(document.getElementById('m-monto-total')).toHaveValue('1.010.000')
    expect(document.getElementById('retiro-parcial-fields')).toHaveStyle({ display: 'none' })
    await user.click(modal().getByRole('button', { name: 'Confirmar retiro' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({
      method: 'POST',
      url: '/api/inv/5/retiro',
      headers: H,
      body: { tipo: 'total', monto: 1010000, fecha: '2026-11-12T10:30', notas: '', registrar_tx: true },
    })
    expect(f.mutations()[0]?.body).not.toHaveProperty('saldo_queda')
  })

  it('parcial con saldo_queda', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/inv/5/retiro': {} })
    await abrir(user)
    await user.click(modal().getByRole('button', { name: 'Parcial' }))
    expect(document.getElementById('retiro-total-fields')).toHaveStyle({ display: 'none' })
    await typeMoney(user, 'm-monto-parcial', '200000')
    await typeMoney(user, 'm-saldo-queda', '810000')
    await user.type(document.getElementById('m-notas-retiro') as HTMLElement, 'parte')
    await user.click(modal().getByRole('button', { name: 'Confirmar retiro' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toEqual({
      tipo: 'parcial',
      monto: 200000,
      saldo_queda: 810000,
      fecha: '2026-11-12T10:30',
      notas: 'parte',
      registrar_tx: true,
    })
  })

  it('parcial valida monto y saldo vacío', async () => {
    const user = userEvent.setup()
    const f = mockFetch()
    await abrir(user)
    await user.click(modal().getByRole('button', { name: 'Parcial' }))
    await user.click(modal().getByRole('button', { name: 'Confirmar retiro' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Ingresá el monto que retirás')
    await typeMoney(user, 'm-monto-parcial', '1000')
    await user.click(modal().getByRole('button', { name: 'Confirmar retiro' }))
    expect(document.getElementById('m-status')).toHaveTextContent('Ingresá el saldo que queda en el fondo')
    expect(f.mutations()).toHaveLength(0)
  })

  it('error del backend', async () => {
    const user = userEvent.setup()
    mockFetch({ 'POST /api/inv/5/retiro': failure(400, 'no') })
    await abrir(user)
    await user.click(modal().getByRole('button', { name: 'Confirmar retiro' }))
    await waitFor(() => expect(document.getElementById('m-status')).toHaveTextContent('❌ no'))
  })
})
