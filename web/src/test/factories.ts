import type { Activo, ApiAll, Categorias, Deuda, Estado, Inversion, Recurrente, Transaccion } from '../types'

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
  mes: '2026-08',
  es_gasto_cartera: tipo === 'gasto',
  tarjeta_nombre: null,
  tarjeta_franquicia: null,
  metodo_pago: 'Efectivo / Débito',
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
  activa: false,
  vigente: false,
  progreso_pct: 0,
  capital_pagado: 0,
  meses_restantes: null,
  nivel_progreso: 'bajo',
  intereses_pagados: null,
  disponible: null,
  uso_pct: 0,
  nivel_uso: 'bajo',
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
  ganancia: 0,
  ganancia_pct: 0,
  tasa_mv: null,
  proximo_pago: null,
  rendimiento_esperado: null,
  desactualizada: false,
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
  cambio: 0,
  cambio_pct: 0,
  desactualizado: false,
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
  frecuencia_label: 'Mensual',
  mensual: 0,
  proximo_pago: null,
  ...extra,
})

const sistema = (nombre: string) => ({ nombre, sistema: true })

export const categoriasBase = (): Categorias => ({
  ingreso: ['Crédito recibido', 'Avance de tarjeta', 'Intereses', 'Dividendos', 'Venta activos'].map(sistema),
  gasto: ['Inversión', 'Compra activos'].map(sistema),
  transfer: ['Pago deuda'].map(sistema),
})

export const estado = (extra: Partial<Estado> = {}): Estado => ({
  transacciones: [],
  deudas: [],
  inversiones: [],
  activos: [],
  recurrentes: [],
  hoy: '2026-08-20',
  mes_actual: '2026-08',
  ajustes: { moneda_simbolo: '$' },
  categorias: categoriasBase(),
  alertas: { activos: false, inversiones: false },
  conteos: { activos: 0, inversiones: 0 },
  ...extra,
})

export const apiAll = (extra: Partial<ApiAll> = {}): ApiAll => ({ ...estado(), ...extra })
