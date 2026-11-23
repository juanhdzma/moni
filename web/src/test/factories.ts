import type { Activo, Categorias, Deuda, Estado, Inversion, Recurrente, Transaccion } from '../types'
import { registrarFilas, type Filas } from './filas'

export const tx = (
  tipo: Transaccion['tipo'],
  categoria: string,
  monto: number,
  extra: Partial<Transaccion> = {},
): Transaccion => ({
  id: 0,
  tipo,
  categoria,
  monto,
  fecha: '2026-08-01',
  descripcion: '',
  notas: '',
  tarjeta_id: null,
  tarjeta_nombre: null,
  tarjeta_franquicia: null,
  metodo_pago: 'Efectivo / Débito',
  ...extra,
})

export const deuda = (extra: Partial<Deuda> = {}): Deuda => ({
  id: 1,
  nombre: 'Deuda',
  monto_inicial: 0,
  saldo_actual: 0,
  tasa_ea: 0,
  cuota_mensual: 0,
  fecha_inicio: '',
  proxima_cuota: '',
  es_tarjeta: false,
  cupo: 0,
  franquicia: '',
  total_intereses: 0,
  activa: false,
  vigente: false,
  progreso_pct: 0,
  capital_pagado: 0,
  meses_restantes: null,
  nivel_progreso: 'bajo',
  disponible: null,
  uso_pct: 0,
  nivel_uso: 'bajo',
  frases: {
    detalle: '',
    meses_restantes_texto: null,
    progreso_texto: '',
    intereses_texto: null,
    intereses_ayuda: '',
    intereses_saldada_texto: null,
  },
  ...extra,
})

export const inversion = (extra: Partial<Inversion> = {}): Inversion => ({
  id: 1,
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
  desactualizado: false,
  texto_tasa: null,
  capitaliza_default: false,
  ...extra,
})

export const activo = (extra: Partial<Activo> = {}): Activo => ({
  id: 1,
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
  nombre: 'Rec',
  tipo: 'gasto',
  monto: 0,
  frecuencia: 'mensual',
  activo: true,
  fecha_inicio: '',
  notas: '',
  categoria_sugerida: 'Servicios',
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

export const estado = (extra: Partial<Estado> & Filas = {}): Estado => {
  const { transacciones, deudas, inversiones, activos, recurrentes, ...bootstrap } = extra
  registrarFilas({ transacciones, deudas, inversiones, activos, recurrentes })
  return {
    hoy: '2026-08-20',
    ahora: '2026-08-20T10:30',
    ajustes: { moneda_simbolo: '$' },
    categorias: categoriasBase(),
    alertas: { activos: false, inversiones: false },
    desactualizado: { dias: 30, texto: 'Valor sin actualizar hace más de 1 mes' },
    ...bootstrap,
  }
}
