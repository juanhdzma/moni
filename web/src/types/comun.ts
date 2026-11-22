export type TipoTx = 'ingreso' | 'gasto' | 'transfer'
export type TipoRec = 'ingreso' | 'gasto'
export type TipoInv = 'fija' | 'variable'
export type PagoInv = 'mensual' | 'vencimiento'

export type Frecuencia =
  | 'semanal'
  | 'quincenal'
  | 'mensual'
  | 'bimestral'
  | 'trimestral'
  | 'semestral'
  | 'anual'

export type Nivel = 'alto' | 'medio' | 'bajo'

export interface ProximoPago {
  fecha: string
  dias: number
  texto: string
}

export interface Segmento {
  key: string
  label: string
  valor: number
}

export interface Tasa {
  ea: number | null
  mv: number | null
}

export interface WithId {
  _id: number
}

export interface OkResponse {
  ok: true
}

export interface ImportResult {
  transacciones: number
  deudas: number
  inversiones: number
  activos: number
  recurrentes: number
}

export interface CategoriaItem {
  nombre: string
  sistema: boolean
}

export type Categorias = Record<TipoTx, CategoriaItem[]>
