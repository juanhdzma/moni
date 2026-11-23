export type TipoTx = 'ingreso' | 'gasto' | 'transfer'
export type TipoRec = 'ingreso' | 'gasto'
export type TipoInv = 'fija' | 'variable'
export type PagoInv = 'mensual' | 'vencimiento'

export interface Opcion<T extends string = string> {
  value: T
  label: string
}

export interface OpcionConAyuda extends Opcion {
  hint: string
}

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
  texto: string | null
}

export interface CategoriaItem {
  nombre: string
  sistema: boolean
}

export type Categorias = Record<TipoTx, CategoriaItem[]>
