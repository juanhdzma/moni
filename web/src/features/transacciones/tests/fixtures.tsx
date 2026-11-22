import { deuda, estado, tx } from '../../../test/factories'
import { mockFetch as base } from '../../../test/mockFetch'
import { renderWithProviders } from '../../../test/render'
import type { ListadoTx } from '../../../types'
import { Transacciones } from '..'

export const datos = () =>
  estado({
    deudas: [deuda({ _id: 5, nombre: 'Visa Oro', es_tarjeta: 1, franquicia: 'Visa' })],
    transacciones: [
      tx('gasto', 'Comida', 5000, { _id: 1, id: 1, fecha: '2026-03-10T10:00', descripcion: 'Mercado', tarjeta_id: 5 }),
      tx('ingreso', 'Salario', 900000, { _id: 2, id: 2, fecha: '2026-04-02T08:00' }),
      tx('transfer', 'Pago deuda', 100, { _id: 3, id: 3, fecha: '2026-04-03T08:00' }),
    ],
  })

export const mercado: ListadoTx['items'][number] = {
  id: 1,
  fecha: '2026-03-10T10:00',
  tipo: 'gasto',
  categoria: 'Comida',
  descripcion: 'Mercado',
  monto: 5000,
  notas: '',
  tarjeta_id: 5,
  mes: '2026-03',
  es_gasto_cartera: false,
  metodo_pago: 'Visa Oro',
  tarjeta_nombre: 'Visa Oro',
  tarjeta_franquicia: 'Visa',
  grupo: 'Marzo - 2026',
}
export const salario: ListadoTx['items'][number] = {
  id: 2,
  fecha: '2026-04-02T08:00',
  tipo: 'ingreso',
  categoria: 'Salario',
  descripcion: '',
  monto: 900000,
  notas: '',
  tarjeta_id: null,
  mes: '2026-04',
  es_gasto_cartera: false,
  metodo_pago: 'Efectivo / Débito',
  tarjeta_nombre: null,
  tarjeta_franquicia: null,
  grupo: 'Abril - 2026',
}
export const opciones = {
  meses: [
    { value: '2026-04', label: 'abril de 2026' },
    { value: '2026-03', label: 'marzo de 2026' },
  ],
  categorias: ['Comida', 'Salario'],
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
    segmentos: [{ key: 'Comida', label: 'Comida', valor: 5000 }],
  },
  ...extra,
})
export const mockFetch = (routes: Record<string, unknown> = {}) => base({ 'GET /api/tx': listado(), ...routes })
export const URL_BASE = '/api/tx?col=fecha&dir=-1&tipo=&mes=&cat='

export const filaDe = (t: ReturnType<typeof tx>): ListadoTx['items'][number] => ({ ...mercado, ...t, tarjeta_franquicia: null, grupo: null })
export const ui = (e = datos()) => renderWithProviders(<Transacciones active />, { estado: e })
