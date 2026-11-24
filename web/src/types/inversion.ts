import type { PagoInv, ProximoPago, Segmento, TextoVacio, TipoInv } from './comun'

export interface Inversion {
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
  proximo_pago: ProximoPago | null
  rendimiento_esperado: number | null
  desactualizado: boolean
  texto_tasa: string | null
  capitaliza_default: boolean
}

export type InvIn = Pick<Inversion, 'nombre' | 'tipo' | 'monto_invertido' | 'tasa_ea' | 'fecha_inicio' | 'pago' | 'dia_pago'> &
  Partial<Pick<Inversion, 'valor_actual' | 'valor_actualizado_en'>> & { tasa_tipo?: 'ea' | 'mv'; crear_tx?: boolean }

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
  nuevo_valor?: number
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
  total_actual: number
  ganancia: number
  ganancia_pct: number
  mostrar_ganancia: boolean
  texto_ganancia: string
  segmentos: Segmento[]
  texto_posiciones: string
  fijas: Inversion[]
  variables: Inversion[]
  texto_vacio_fijas: TextoVacio
  texto_vacio_variables: TextoVacio
}

export interface PreviewAporte {
  nuevo_valor_estimado: number
  texto_estimado: string
}

export interface PreviewValor {
  delta: number
  total: number
  total_pct: number
}

export interface InvValor {
  nuevo_valor: number
  fecha: string
}
