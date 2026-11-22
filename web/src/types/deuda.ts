import type { Nivel, Segmento } from './comun'

export interface InteresesPagados {
  valor: number
  exacto: boolean
}

export interface FrasesDeuda {
  detalle: string
  meses_restantes_texto: string | null
  progreso_texto: string
  intereses_texto: string | null
  intereses_ayuda: string
  intereses_saldada_texto: string | null
}

export interface DatoResumenDeudas {
  cuotas: string
  cuotas_sufijo: string
  intereses: string | null
  intereses_sufijo: string
}

export interface Deuda {
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
  frases?: FrasesDeuda
}

export type DeudaIn = Pick<
  Deuda,
  'nombre' | 'monto_inicial' | 'saldo_actual' | 'tasa_ea' | 'cuota_mensual' | 'fecha_inicio' | 'proxima_cuota' | 'cupo' | 'franquicia'
> & { es_tarjeta: boolean; crear_tx?: boolean }

export interface DeudaPago {
  nuevo_saldo: number
  total_pagado: number
  fecha?: string
  descripcion?: string
  notas: string
  registrar_tx: boolean
  avanzar_cuota: boolean
  op_clave?: string | null
}

export interface DeudaAdelanto {
  monto: number
  nuevo_saldo?: number
  disponible_nuevo?: number
  fecha?: string
  descripcion?: string
  notas: string
  registrar_tx: boolean
}

export interface ResumenDeudas {
  total: number
  total_cuotas: number
  total_intereses: number
  intereses_aproximado: boolean
  segmentos: Segmento[]
  dato: DatoResumenDeudas
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
  nuevo_saldo: number
}
