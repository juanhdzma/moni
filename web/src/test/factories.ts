import type { Activo, Categorias, Deuda, Estado, Inversion, Recurrente, Transaccion } from '@/types'
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
  monto_firmado: tipo === 'ingreso' ? monto : -monto,
  fecha: '2026-08-01',
  descripcion: '',
  notas: '',
  tarjeta_id: null,
  tarjeta_nombre: null,
  tarjeta_franquicia: null,
  metodo_pago: 'Efectivo / Débito',
  editable: true,
  tono: tipo === 'ingreso' ? 'ingreso' : tipo === 'gasto' ? 'gasto' : 'neutro',
  icono_metodo: 'efectivo',
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
  clase_deuda: 'prestamo',
  pago: {
    cuota: { monto: null, nuevo_saldo: null, hint: 'Ingresá cuánto pagaste.' },
    abono: { monto: null, nuevo_saldo: null, hint: 'Ingresá cuánto abonaste.' },
    liquidar: { monto: 0, nuevo_saldo: 0, hint: 'Ajustá si el banco cobra intereses adicionales al cancelar.' },
  },
  cupo: 0,
  franquicia: '',
  progreso_pct: 0,
  capital_pagado: 0,
  nivel_progreso: 'bajo',
  tono_progreso: 'negativo',
  disponible: null,
  tiene_cupo: false,
  uso_pct: 0,
  nivel_uso: 'bajo',
  tono_uso: 'positivo',
  total_intereses: 0,
  frases: {
    detalle: '',
    meses_restantes_texto: null,
    progreso_texto: '',
    intereses_texto: null,
    intereses_ayuda: '',
    intereses_saldada_texto: null,
    disponible_texto: null,
    saldada_badge: 'Saldado',
    capital_pagado_texto: 'capital total pagado',
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
  ganancia: 0,
  ganancia_pct: 0,
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
    desactualizado: { texto: 'Valor sin actualizar hace más de 1 mes' },
    ...bootstrap,
  }
}
