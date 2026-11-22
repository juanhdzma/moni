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
  mes: string
  es_gasto_cartera: boolean
  tarjeta_nombre: string | null
  tarjeta_franquicia: string | null
  metodo_pago: string
}

export type Nivel = 'alto' | 'medio' | 'bajo'

export interface InteresesPagados {
  valor: number
  exacto: boolean
}

export interface ProximoPago {
  fecha: string
  dias: number
  texto: string
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
  activa: boolean
  vigente: boolean
  progreso_pct: number
  capital_pagado: number
  meses_restantes: number | null
  nivel_progreso: Nivel
  intereses_pagados: InteresesPagados | null
  disponible: number | null
  uso_pct: number
  nivel_uso: Nivel
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
  ganancia: number
  ganancia_pct: number
  tasa_mv: number | null
  proximo_pago: ProximoPago | null
  rendimiento_esperado: number | null
  desactualizada: boolean
}

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

export interface ApiRecurrente {
  id: number
  nombre: string
  tipo: TipoRec
  monto: number
  frecuencia: Frecuencia
  activo: boolean
  fecha_inicio: string
  notas: string
  frecuencia_label: string
  mensual: number
  proximo_pago: ProximoPago | null
}

export interface CategoriaItem {
  nombre: string
  sistema: boolean
}

export type Categorias = Record<TipoTx, CategoriaItem[]>

export interface Ajustes {
  moneda_simbolo: string
}

export interface Alertas {
  activos: boolean
  inversiones: boolean
}

export interface Conteos {
  activos: number
  inversiones: number
}

export interface ApiAll {
  transacciones: ApiTransaccion[]
  deudas: ApiDeuda[]
  inversiones: ApiInversion[]
  activos: ApiActivo[]
  recurrentes: ApiRecurrente[]
  hoy: string
  mes_actual: string
  ajustes: Ajustes
  categorias: Categorias
  alertas: Alertas
  conteos: Conteos
}

export interface WithId {
  _id: number
}

export type Transaccion = ApiTransaccion & WithId
export type Deuda = ApiDeuda & WithId
export type Inversion = ApiInversion & WithId
export type Activo = ApiActivo & WithId
export type Recurrente = ApiRecurrente & WithId

export interface Estado {
  transacciones: Transaccion[]
  deudas: Deuda[]
  inversiones: Inversion[]
  activos: Activo[]
  recurrentes: Recurrente[]
  hoy: string
  mes_actual: string
  ajustes: Ajustes
  categorias: Categorias
  alertas: Alertas
  conteos: Conteos
}

export interface Segmento {
  key: string
  label: string
  valor: number
}

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
  tasa_tipo?: 'ea' | 'mv'
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
  op_clave?: string | null
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
  op_clave?: string | null
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

export interface ParteResumen {
  id: 'activos' | 'inversiones' | 'balance' | 'deudas'
  nombre: string
  valor: number
  negativo: boolean
  detalle: string | null
  detalle_tipo?: 'ganancia'
  detalle_datos?: { ganancia: number; ganancia_pct: number } | { cuota_total: number; n: string }
}

export type FraseMes =
  | { tipo: 'sin_ingresos' }
  | { tipo: 'quedo'; pct: number }
  | { tipo: 'excedio'; pct: number }

export interface ResumenDashboard {
  patrimonio: number
  efectivo: number
  total_deuda: number
  total_inv: number
  total_activos: number
  ingresos_mes: number
  gastos_mes: number
  quedo_mes: number
  ahorro_pct: number
  proy_delta: number
  cuota_total: number
  deudas_activas: number
  total_invertido: number
  ganancia_inv: number
  ganancia_inv_pct: number
  partes: ParteResumen[]
  total_barra: number
  frase_mes: FraseMes
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
}

export interface GastosPeriodo {
  periodo: PeriodoGastos
  nombre_periodo: string
  total: number
  max: number
  top: { categoria: string; valor: number; pct: number } | null
  categorias: CategoriaGasto[]
}

export interface Movimiento {
  id: number
  fecha: string
  tipo: TipoTx
  categoria: string
  descripcion: string
  monto: number
}

export interface Movimientos {
  items: Movimiento[]
}

export interface OperacionProxima {
  clave: string
  tipo: 'deuda' | 'inversion' | 'recurrente'
  fuente_id: number
  fecha: string
  dia: number
  mes_corto: string
  etiqueta: string
  sub: string
  monto: number
  dias: number
  texto_dias: string
  vencida: boolean
}

export interface ProximasOperaciones {
  hoy: string
  items: OperacionProxima[]
  vencidas: number
  salen_total: number
}

export interface OpOculta {
  clave: string
  tipo: string
  fuente_id: number
  fecha: string
  etiqueta: string | null
}

export interface OpsOcultas {
  items: OpOculta[]
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

export interface ResumenDeudas {
  total: number
  total_cuotas: number
  total_intereses: number
  intereses_aproximado: boolean
  segmentos: Segmento[]
  creditos: Deuda[]
  tarjetas: Deuda[]
  terminadas: Deuda[]
}

export interface ResumenInversiones {
  total_invertido: number
  total_actual: number
  ganancia: number
  ganancia_pct: number
  segmentos: Segmento[]
  fijas: Inversion[]
  variables: Inversion[]
}

export interface ResumenActivos {
  total_inicial: number
  total_actual: number
  variacion: number
  variacion_pct: number
  segmentos: Segmento[]
  items: Activo[]
}

export interface ResumenRecurrentes {
  total_gastos_mensual: number
  total_ingresos_mensual: number
  neto_mensual: number
  segmentos: Segmento[]
  ingresos: Recurrente[]
  gastos: Recurrente[]
}

export interface PreviewPago {
  capital: number
  intereses: number
}

export interface PreviewAdelanto {
  comision: number
}

export interface PreviewValor {
  delta: number
  total: number
  total_pct: number
}

export interface PreviewAporte {
  nuevo_valor_estimado: number
}

export interface PreviewVenta {
  vs_inicial: number
  vs_actual: number
}

export interface Tasa {
  ea: number | null
  mv: number | null
}

export interface MigrarLocalIn {
  categorias: Record<TipoTx, string[]>
  ops_ocultas: string[]
  moneda_simbolo: string | null
}

export interface MigrarLocalResult {
  categorias: number
  ops_ocultas: number
  moneda_simbolo: boolean
}
