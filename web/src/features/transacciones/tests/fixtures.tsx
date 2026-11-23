import { deuda, estado, tx } from '../../../test/factories'
import { mockFetch as base } from '../../../test/mockFetch'
import { renderWithProviders } from '../../../test/render'
import type { ListadoTx, OpcionesTx } from '../../../types'
import { Transacciones } from '..'

export const datos = () =>
  estado({
    deudas: [deuda({ id: 5, nombre: 'Visa Oro', es_tarjeta: true, franquicia: 'Visa' })],
    transacciones: [
      tx('gasto', 'Comida', 5000, { id: 1, fecha: '2026-03-10T10:00', descripcion: 'Mercado', tarjeta_id: 5 }),
      tx('ingreso', 'Salario', 900000, { id: 2, fecha: '2026-04-02T08:00' }),
      tx('transfer', 'Pago deuda', 100, { id: 3, fecha: '2026-04-03T08:00' }),
    ],
  })

export const mercado: ListadoTx['items'][number] = {
  id: 1,
  fecha: '2026-03-10T10:00',
  tipo: 'gasto',
  categoria: 'Comida',
  descripcion: 'Mercado',
  monto: 5000,
  monto_firmado: -5000,
  notas: '',
  tarjeta_id: 5,
  metodo_pago: 'Visa Oro',
  tarjeta_nombre: 'Visa Oro',
  tarjeta_franquicia: 'Visa',
  grupo: 'Marzo - 2026',
  tipo_label: 'Gasto',
}
export const salario: ListadoTx['items'][number] = {
  id: 2,
  fecha: '2026-04-02T08:00',
  tipo: 'ingreso',
  categoria: 'Salario',
  descripcion: '',
  monto: 900000,
  monto_firmado: 900000,
  notas: '',
  tarjeta_id: null,
  metodo_pago: 'Efectivo / Débito',
  tarjeta_nombre: null,
  tarjeta_franquicia: null,
  grupo: 'Abril - 2026',
  tipo_label: 'Ingreso',
}
export const opciones = {
  meses: [
    { value: '2026-04', label: 'abril de 2026' },
    { value: '2026-03', label: 'marzo de 2026' },
  ],
  categorias: ['Comida', 'Salario'],
  tipos: [
    { value: 'ingreso', label: 'Ingresos' },
    { value: 'gasto', label: 'Gastos' },
  ],
}
export const listado = (extra: Partial<ListadoTx> = {}): ListadoTx => ({
  items: [salario, mercado],
  filtros: { tipo: '', mes: '', cat: '' },
  opciones,
  pills: [],
  resumen: {
    ingresos: 900000,
    gastos: 5000,
    neto: 895000,
    dato: { texto: 'entró $900.000 · salió $5.000', partes: [] },
    segmentos: [{ key: 'Comida', label: 'Comida', valor: 5000 }],
  },
  ...extra,
})
export const opcionesTx = (extra: Partial<OpcionesTx> = {}): OpcionesTx => ({
  tarjetas: [{ id: 5, nombre: 'Visa Oro' }],
  categorias: { ingreso: ['Crédito recibido', 'Salario'], gasto: ['Inversión', 'Compra activos'] },
  categoria_default: { ingreso: 'Crédito recibido', gasto: 'Inversión' },
  inicial: { tipo: 'gasto', categoria: 'Inversión', tarjeta_id: null, fecha: '2026-06-15T10:30' },
  ...extra,
})
export const mockFetch = (routes: Record<string, unknown> = {}) =>
  base({ 'GET /api/tx': listado(), 'GET /api/tx/opciones': opcionesTx(), ...routes })
export const URL_BASE = '/api/tx?col=fecha&dir=-1&tipo=&mes=&cat='

export const filaDe = (t: ReturnType<typeof tx>): ListadoTx['items'][number] => ({ ...mercado, ...t, tarjeta_franquicia: null, grupo: null })
export const ui = (e = datos()) => renderWithProviders(<Transacciones active />, { estado: e })
