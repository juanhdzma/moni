import type { PagoInv, ProximoPago, Segmento, TipoInv, WithId } from './comun'

export interface ApiInversion {
  id: number
  nombre: string
  tipo: TipoInv
  monto_invertido: number
  valor_actual: number
  tasa_ea: number | null
  fecha_inicio: string
  pago: PagoInv | null
  dia_pago: number | null
  valor_actualizado_en: string
  ganancia: number
  ganancia_pct: number
  tasa_mv: number | null
  proximo_pago: ProximoPago | null
  rendimiento_esperado: number | null
  desactualizada: boolean
}

export type Inversion = ApiInversion & WithId

export interface InvIn {
  nombre: string
  tipo: TipoInv
  monto_invertido: number
  valor_actual: number
  tasa_ea: number | null
  fecha_inicio: string
  pago: PagoInv | null
  dia_pago: number | null
  valor_actualizado_en: string
  tasa_tipo?: 'ea' | 'mv'
  crear_tx?: boolean
}

export interface InvRendimiento {
  monto: number
  fecha: string
  notas: string
  registrar_tx: boolean
  capitaliza: boolean
  op_clave?: string | null
}

export interface InvAporte {
  monto: number
  nuevo_valor: number
  fecha: string
  notas: string
  registrar_tx: boolean
}

export interface InvRetiro {
  tipo: 'total' | 'parcial'
  monto: number
  saldo_queda?: number
  fecha: string
  notas: string
  registrar_tx: boolean
}

export interface ResumenInversiones {
  total_invertido: number
  total_actual: number
  ganancia: number
  ganancia_pct: number
  segmentos: Segmento[]
  fijas: Inversion[]
  variables: Inversion[]
}

export interface PreviewAporte {
  nuevo_valor_estimado: number
}
