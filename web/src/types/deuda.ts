import type { Nivel, Segmento, TextoVacio } from './comun'

export interface FrasesDeuda {
  detalle: string
  meses_restantes_texto: string | null
  progreso_texto: string
  intereses_texto: string | null
  intereses_ayuda: string
  intereses_saldada_texto: string | null
  disponible_texto: string | null
  saldada_badge: string
  capital_pagado_texto: string
}

export interface DatoResumenDeudas {
  cuotas: string
  cuotas_sufijo: string
  intereses: string | null
  intereses_sufijo: string
}

export type ModoPago = 'cuota' | 'abono' | 'liquidar'

export interface SugerenciaPago {
  monto: number | null
  nuevo_saldo: number | null
  hint: string
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
  es_tarjeta: boolean
  clase_deuda: string
  pago: Record<ModoPago, SugerenciaPago>
  cupo: number
  franquicia: string
  activa: boolean
  vigente: boolean
  progreso_pct: number
  capital_pagado: number
  nivel_progreso: Nivel
  disponible: number | null
  tiene_cupo: boolean
  uso_pct: number
  nivel_uso: Nivel
  frases: FrasesDeuda
}

export type DeudaIn = Pick<
  Deuda,
  'nombre' | 'monto_inicial' | 'saldo_actual' | 'tasa_ea' | 'cuota_mensual' | 'fecha_inicio' | 'proxima_cuota' | 'cupo' | 'franquicia'
> & { clase_deuda: string; crear_tx?: boolean }

export interface DeudaPago {
  nuevo_saldo: number
  total_pagado: number
  intereses?: number
  fecha?: string
  descripcion?: string
  notas: string
  registrar_tx: boolean
  modo: ModoPago
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
  segmentos: Segmento[]
  dato: DatoResumenDeudas
  creditos: Deuda[]
  tarjetas: Deuda[]
  terminadas: Deuda[]
  texto_vacio_creditos: TextoVacio
  texto_vacio_tarjetas: TextoVacio
}

export interface PreviewPago {
  capital: number
  intereses: number
}

export interface PreviewAdelanto {
  comision: number
  nuevo_saldo: number
}
