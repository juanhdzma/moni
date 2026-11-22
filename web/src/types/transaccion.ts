import type { Segmento, TipoTx, WithId } from './comun'

export interface ApiTransaccion {
  id: number
  fecha: string
  tipo: TipoTx
  categoria: string
  descripcion: string
  monto: number
  notas: string
  tarjeta_id: number | null
  mes: string
  es_gasto_cartera: boolean
  tarjeta_nombre: string | null
  tarjeta_franquicia: string | null
  metodo_pago: string
}

export type Transaccion = ApiTransaccion & WithId

export interface TxIn {
  fecha: string
  tipo: TipoTx
  categoria: string
  descripcion: string
  monto: number
  notas: string
  tarjeta_id: number | null
  op_clave?: string | null
}

export type ColTx = 'fecha' | 'tipo' | 'categoria' | 'descripcion' | 'monto'

export interface FiltrosTx {
  col?: ColTx
  dir?: 1 | -1
  tipo?: 'ingreso' | 'gasto' | ''
  mes?: string
  cat?: string
}

export interface FilaTx extends ApiTransaccion {
  grupo: string | null
}

export interface ListadoTx {
  items: FilaTx[]
  filtros: { tipo: string; mes: string; cat: string }
  opciones: { meses: { value: string; label: string }[]; categorias: string[] }
  pills: { campo: 'mes' | 'tipo' | 'cat'; label: string }[]
  resumen: { ingresos: number; gastos: number; neto: number; segmentos: Segmento[] }
}
