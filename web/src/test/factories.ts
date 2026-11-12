import type { Activo, Deuda, Estado, Inversion, Recurrente, Transaccion } from '../types'

export const tx = (
  tipo: Transaccion['tipo'],
  categoria: string,
  monto: number,
  extra: Partial<Transaccion> = {},
): Transaccion => ({
  id: 0,
  _id: 0,
  tipo,
  categoria,
  monto,
  fecha: '2026-08-01',
  descripcion: '',
  notas: '',
  tarjeta_id: null,
  ...extra,
})

export const deuda = (extra: Partial<Deuda> = {}): Deuda => ({
  id: 1,
  _id: 1,
  nombre: 'Deuda',
  monto_inicial: 0,
  saldo_actual: 0,
  tasa_ea: 0,
  cuota_mensual: 0,
  fecha_inicio: '',
  proxima_cuota: '',
  es_tarjeta: 0,
  cupo: 0,
  franquicia: '',
  total_intereses: 0,
  ...extra,
})

export const inversion = (extra: Partial<Inversion> = {}): Inversion => ({
  id: 1,
  _id: 1,
  nombre: 'Inv',
  tipo: 'variable',
  monto_invertido: 0,
  valor_actual: 0,
  tasa_ea: null,
  fecha_inicio: '',
  pago: null,
  dia_pago: null,
  valor_actualizado_en: '',
  ...extra,
})

export const activo = (extra: Partial<Activo> = {}): Activo => ({
  id: 1,
  _id: 1,
  nombre: 'Activo',
  valor_inicial: 0,
  valor_actual: 0,
  fecha_adquisicion: '',
  valor_actualizado_en: '',
  ...extra,
})

export const recurrente = (extra: Partial<Recurrente> = {}): Recurrente => ({
  id: 1,
  _id: 1,
  nombre: 'Rec',
  tipo: 'gasto',
  monto: 0,
  frecuencia: 'mensual',
  activo: true,
  fecha_inicio: '',
  notas: '',
  ...extra,
})

export const estado = (extra: Partial<Estado> = {}): Estado => ({
  transacciones: [],
  deudas: [],
  inversiones: [],
  activos: [],
  recurrentes: [],
  ...extra,
})
