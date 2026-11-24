export type TipoTx = 'ingreso' | 'gasto' | 'transfer'
export type TipoRec = 'ingreso' | 'gasto'
export type TipoInv = 'fija' | 'variable'
export type PagoInv = 'mensual' | 'vencimiento'

export interface Opcion<T extends string = string> {
  value: T
  label: string
}

export interface OpcionConTono<T extends string = string> extends Opcion<T> {
  tono?: TipoRec | null
}

export interface OpcionConAyuda extends OpcionConTono {
  hint: string
}

export interface TextoVacio {
  titulo: string
  texto: string
}

export type Entidad =
  | 'transacciones'
  | 'deudas'
  | 'inversiones'
  | 'activos'
  | 'recurrentes'
  | 'categorias'
  | 'ajustes'
  | 'opsOcultas'

export type Nivel = 'alto' | 'medio' | 'bajo'

export interface ProximoPago {
  fecha: string
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
