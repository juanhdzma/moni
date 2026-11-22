import type { Segmento, WithId } from './comun'

export interface ApiActivo {
  id: number
  nombre: string
  valor_inicial: number
  valor_actual: number
  fecha_adquisicion: string
  valor_actualizado_en: string
  cambio: number
  cambio_pct: number
  desactualizado: boolean
}

export type Activo = ApiActivo & WithId

export interface ActivoIn {
  nombre: string
  valor_inicial: number
  valor_actual: number
  fecha_adquisicion: string
  valor_actualizado_en: string
  crear_tx?: boolean
}

export interface ActivoVenta {
  precio: number
  fecha: string
  notas: string
  registrar_tx: boolean
}

export interface ResumenActivos {
  total_inicial: number
  total_actual: number
  variacion: number
  variacion_pct: number
  segmentos: Segmento[]
  items: Activo[]
}

export interface PreviewVenta {
  vs_inicial: number
  vs_actual: number
}
