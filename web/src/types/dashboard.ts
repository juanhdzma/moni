import type { TipoTx } from './comun'

export type TonoFrase = 'positivo' | 'negativo' | 'fuerte' | null

export interface Frase {
  texto: string
  partes: { texto: string; tono: TonoFrase }[]
}

export interface ParteResumen {
  id: 'activos' | 'inversiones' | 'balance' | 'deudas'
  nombre: string
  valor: number
  negativo: boolean
  detalle: string | null
}

export type FraseMes = Frase & { tipo: 'sin_ingresos' | 'quedo' | 'excedio'; pct?: number }

export interface ResumenDashboard {
  patrimonio: number
  proy_delta: number
  texto_proyeccion: string
  partes: ParteResumen[]
  total_barra: number
}

export type SerieEvolucion = 'patrimonio' | 'inversiones'
export type PeriodoEvolucion = '1M' | '3M' | '6M' | '1Y' | 'ALL'
export type PeriodoGastos = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'

export interface PuntoEvolucion {
  mes: string
  valor: number
}

export interface Evolucion {
  serie: SerieEvolucion
  periodo: PeriodoEvolucion
  meses: number
  puntos: PuntoEvolucion[]
  desde: number
  hasta: number
  cambio: number
  verbo: string
  sujeto: string
  mes_desde: string
  nombre_serie: string
  frase: Frase
}

export interface MesEntroSalio {
  mes: string
  entro: number
  salio: number
}

export interface EsteMes {
  ingresos: number
  gastos: number
  quedo: number
  ahorro_pct: number
  frase: FraseMes
  descripcion_grafico: string
  meses: MesEntroSalio[]
}

export interface DetalleGasto {
  id: number
  fecha: string
  descripcion: string
  categoria: string
  monto: number
}

export interface CategoriaGasto {
  categoria: string
  valor: number
  n: number
  detalle: DetalleGasto[]
  restantes: number
  restantes_texto: string | null
}

export interface GastosPeriodo {
  periodo: PeriodoGastos
  nombre_periodo: string
  total: number
  max: number
  top: { categoria: string; valor: number; pct: number } | null
  frase: Frase | null
  categorias: CategoriaGasto[]
}

export interface Movimiento {
  id: number
  fecha: string
  tipo: TipoTx
  categoria: string
  descripcion: string
  monto: number
  monto_firmado: number
}

export interface Movimientos {
  items: Movimiento[]
}
