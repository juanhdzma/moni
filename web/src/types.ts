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

export interface ApiTransaccion {
  id: number
  fecha: string
  tipo: TipoTx
  categoria: string
  descripcion: string
  monto: number
  notas: string
  tarjeta_id: number | null
}

export interface ApiDeuda {
  id: number
  nombre: string
  monto_inicial: number
  saldo_actual: number
  tasa_ea: number
  cuota_mensual: number
  fecha_inicio: string
  proxima_cuota: string
  es_tarjeta: number
  cupo: number
  franquicia: string
  total_intereses: number
}

export interface ApiInversion {
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
}

export interface ApiActivo {
  id: number
  nombre: string
  valor_inicial: number
  valor_actual: number
  fecha_adquisicion: string
  valor_actualizado_en: string
}

export interface ApiRecurrente {
  id: number
  nombre: string
  tipo: TipoRec
  monto: number
  frecuencia: Frecuencia
  activo: number
  fecha_inicio: string
  notas: string
}

export interface ApiAll {
  transacciones: ApiTransaccion[]
  deudas: ApiDeuda[]
  inversiones: ApiInversion[]
  activos: ApiActivo[]
  recurrentes: ApiRecurrente[]
}

export interface WithId {
  _id: number
}

export type Transaccion = ApiTransaccion & WithId
export type Deuda = ApiDeuda & WithId
export type Inversion = ApiInversion & WithId
export type Activo = ApiActivo & WithId
export type Recurrente = Omit<ApiRecurrente, 'activo'> & WithId & { activo: boolean }

export interface Estado {
  transacciones: Transaccion[]
  deudas: Deuda[]
  inversiones: Inversion[]
  activos: Activo[]
  recurrentes: Recurrente[]
}

export interface TxIn {
  fecha: string
  tipo: TipoTx
  categoria: string
  descripcion: string
  monto: number
  notas: string
  tarjeta_id: number | null
}

export interface DeudaIn {
  nombre: string
  monto_inicial: number
  saldo_actual: number
  tasa_ea: number
  cuota_mensual: number
  fecha_inicio: string
  proxima_cuota: string
  es_tarjeta: boolean
  cupo: number
  franquicia: string
  crear_tx?: boolean
}

export interface InvIn {
  nombre: string
  tipo: TipoInv
  monto_invertido: number
  valor_actual: number
  tasa_ea: number | null
  fecha_inicio: string
  pago: PagoInv | null
  dia_pago: number | null
  valor_actualizado_en: string
  crear_tx?: boolean
}

export interface ActivoIn {
  nombre: string
  valor_inicial: number
  valor_actual: number
  fecha_adquisicion: string
  valor_actualizado_en: string
  crear_tx?: boolean
}

export interface RecIn {
  nombre: string
  tipo: TipoRec
  monto: number
  frecuencia: Frecuencia
  activo: boolean
  fecha_inicio: string
  notas: string
}

export interface DeudaPago {
  nuevo_saldo: number
  total_pagado: number
  intereses: number
  fecha: string
  descripcion: string
  notas: string
  registrar_tx: boolean
  avanzar_cuota: boolean
}

export interface DeudaAdelanto {
  monto: number
  nuevo_saldo: number
  fecha: string
  descripcion: string
  notas: string
  registrar_tx: boolean
}

export interface InvRendimiento {
  monto: number
  fecha: string
  notas: string
  registrar_tx: boolean
  capitaliza: boolean
}

export interface InvAporte {
  monto: number
  nuevo_valor: number
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

export interface ActivoVenta {
  precio: number
  fecha: string
  notas: string
  registrar_tx: boolean
}

export interface ImportResult {
  transacciones: number
  deudas: number
  inversiones: number
  activos: number
  recurrentes: number
}

export interface OkResponse {
  ok: true
}

export type CrudEntity = 'tx' | 'deuda' | 'inv' | 'activo' | 'rec'

export interface CrudPayloads {
  tx: TxIn
  deuda: DeudaIn
  inv: InvIn
  activo: ActivoIn
  rec: RecIn
}
