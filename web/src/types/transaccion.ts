import type { Opcion, Segmento, TextoVacio, TipoRec, TipoTx } from './comun'
import type { Frase } from './dashboard'

export interface Transaccion {
  id: number
  fecha: string
  tipo: TipoTx
  categoria: string
  descripcion: string
  monto: number
  monto_firmado: number
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
  tipo?: TipoTx | ''
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
  resumen: { titulo: string; ingresos: number; gastos: number; neto: number; dato: Frase; segmentos: Segmento[] }
  texto_vacio: TextoVacio
}

export interface OpcionesTx {
  tarjetas: { id: number; nombre: string }[]
  categorias: { ingreso: string[]; gasto: string[] }
  categoria_default: { ingreso: string; gasto: string }
  inicial: { tipo: TipoRec; categoria: string; tarjeta_id: number | null; fecha: string }
}
