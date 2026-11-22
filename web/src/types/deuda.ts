import type { Nivel, Segmento, WithId } from './comun'

export interface InteresesPagados {
  valor: number
  exacto: boolean
}

export interface ApiDeuda {
  id: number
  nombre: string
  monto_inicial: number
  saldo_actual: number
  tasa_ea: number
  cuota_mensual: number
  fecha_inicio: string
  proxima_cuota: string
  es_tarjeta: number
  cupo: number
  franquicia: string
  total_intereses: number
  activa: boolean
  vigente: boolean
  progreso_pct: number
  capital_pagado: number
  meses_restantes: number | null
  nivel_progreso: Nivel
  intereses_pagados: InteresesPagados | null
  disponible: number | null
  uso_pct: number
  nivel_uso: Nivel
}

export type Deuda = ApiDeuda & WithId

export interface DeudaIn {
  nombre: string
  monto_inicial: number
  saldo_actual: number
  tasa_ea: number
  cuota_mensual: number
  fecha_inicio: string
  proxima_cuota: string
  es_tarjeta: boolean
  cupo: number
  franquicia: string
  crear_tx?: boolean
}

export interface DeudaPago {
  nuevo_saldo: number
  total_pagado: number
  intereses: number
  fecha: string
  descripcion: string
  notas: string
  registrar_tx: boolean
  avanzar_cuota: boolean
  op_clave?: string | null
}

export interface DeudaAdelanto {
  monto: number
  nuevo_saldo: number
  fecha: string
  descripcion: string
  notas: string
  registrar_tx: boolean
}

export interface ResumenDeudas {
  total: number
  total_cuotas: number
  total_intereses: number
  intereses_aproximado: boolean
  segmentos: Segmento[]
  creditos: Deuda[]
  tarjetas: Deuda[]
  terminadas: Deuda[]
}

export interface PreviewPago {
  capital: number
  intereses: number
}

export interface PreviewAdelanto {
  comision: number
}
