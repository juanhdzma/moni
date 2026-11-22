import type { Frecuencia, ProximoPago, Segmento, TipoRec, WithId } from './comun'

export interface ApiRecurrente {
  id: number
  nombre: string
  tipo: TipoRec
  monto: number
  frecuencia: Frecuencia
  activo: boolean
  fecha_inicio: string
  notas: string
  frecuencia_label: string
  mensual: number
  proximo_pago: ProximoPago | null
}

export type Recurrente = ApiRecurrente & WithId

export interface RecIn {
  nombre: string
  tipo: TipoRec
  monto: number
  frecuencia: Frecuencia
  activo: boolean
  fecha_inicio: string
  notas: string
}

export interface ResumenRecurrentes {
  total_gastos_mensual: number
  total_ingresos_mensual: number
  neto_mensual: number
  segmentos: Segmento[]
  ingresos: Recurrente[]
  gastos: Recurrente[]
}
