import type { Segmento } from './comun'

export interface Activo {
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

export type ActivoIn = Pick<Activo, 'nombre' | 'valor_inicial'> &
  Partial<Pick<Activo, 'valor_actual' | 'fecha_adquisicion' | 'valor_actualizado_en'>> & { crear_tx?: boolean }

export interface ActivoVenta {
  precio: number
  fecha?: string
  notas: string
  registrar_tx: boolean
}

export interface ActivoValor {
  nuevo_valor: number
  fecha?: string
}

export interface ResumenActivos {
  total_actual: number
  variacion: number
  mostrar_variacion: boolean
  segmentos: Segmento[]
  items: Activo[]
  texto_variacion: string
  texto_conteo: string
}

export interface PreviewVenta {
  vs_inicial: number
  vs_actual: number
}
