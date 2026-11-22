import type { ProximoPago, Segmento, TipoRec } from './comun'

export interface Recurrente {
  id: number
  nombre: string
  tipo: TipoRec
  monto: number
  frecuencia: string
  activo: boolean
  fecha_inicio: string
  notas: string
  categoria_sugerida?: string
  frecuencia_label: string
  mensual: number
  proximo_pago: ProximoPago | null
}

export type RecIn = Pick<Recurrente, 'nombre' | 'tipo' | 'monto' | 'frecuencia' | 'fecha_inicio' | 'notas'> & Partial<Pick<Recurrente, 'activo'>>

export interface OpcionFrecuencia {
  value: string
  label: string
}

export interface ResumenRecurrentes {
  frecuencias: OpcionFrecuencia[]
  total_gastos_mensual: number
  total_ingresos_mensual: number
  neto_mensual: number
  segmentos: Segmento[]
  ingresos: Recurrente[]
  gastos: Recurrente[]
}
