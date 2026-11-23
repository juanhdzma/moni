import type { Opcion, Segmento, TipoTx } from './comun'
import type { Frase } from './dashboard'

export interface Transaccion {
  id: number
  fecha: string
  tipo: TipoTx
  categoria: string
  descripcion: string
  monto: number
  notas: string
  tarjeta_id: number | null
  tarjeta_nombre: string | null
  tarjeta_franquicia: string | null
  metodo_pago: string
}

export type TxIn = Pick<Transaccion, 'tipo' | 'categoria' | 'descripcion' | 'monto' | 'notas' | 'tarjeta_id'> & {
  fecha?: string
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

export interface FilaTx extends Transaccion {
  tipo_label: string
  grupo: string | null
}

export interface ListadoTx {
  items: FilaTx[]
  filtros: { tipo: string; mes: string; cat: string }
  opciones: { meses: Opcion[]; categorias: string[]; tipos: Opcion[] }
  pills: { campo: 'mes' | 'tipo' | 'cat'; label: string }[]
  resumen: { ingresos: number; gastos: number; neto: number; dato: Frase; segmentos: Segmento[] }
}

export interface OpcionesTx {
  tarjetas: { id: number; nombre: string }[]
  categorias: { ingreso: string[]; gasto: string[] }
  categoria_default: { ingreso: string; gasto: string }
  inicial: { tipo: 'ingreso' | 'gasto'; categoria: string; tarjeta_id: number | null; fecha: string }
}
