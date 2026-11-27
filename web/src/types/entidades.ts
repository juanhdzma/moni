import type { Opcional, Refinar, Schemas } from './gen'
import type { operations } from './api.gen'

export type Transaccion = Schemas['Tx']
export type TxIn = Opcional<Schemas['TxIn'], 'fecha' | 'tarjeta_id' | 'op_clave'>

type QueryListado = NonNullable<operations['listar_tx_api_tx_get']['parameters']['query']>
export type ColTx = NonNullable<QueryListado['col']>
export type FiltrosTx = Refinar<QueryListado, { dir?: 1 | -1 }>

export type FilaTx = Schemas['FilaTx']
export type ListadoTx = Refinar<Schemas['ListadoTx'], { pills: { campo: 'mes' | 'tipo' | 'cat'; label: string }[] }>
export type OpcionesTx = Schemas['OpcionesTx']

export type ModoPago = keyof Schemas['PagoSugerido']
export type Deuda = Schemas['Deuda']
export type DeudaIn = Opcional<Schemas['DeudaIn'], 'tasa_tipo'> & { crear_tx?: boolean }
export type DeudaPago = Opcional<Schemas['DeudaPago'], 'nuevo_saldo' | 'intereses' | 'fecha' | 'descripcion' | 'op_clave'>
export type DeudaAdelanto = Opcional<Schemas['DeudaAdelanto'], 'nuevo_saldo' | 'disponible_nuevo' | 'fecha' | 'descripcion'>
export type ResumenDeudas = Schemas['ResumenDeudas']
export type PreviewPago = Schemas['PreviewPago']
export type PreviewAdelanto = Schemas['PreviewAdelanto']

export type Inversion = Schemas['Inversion']
export type InvIn = Opcional<Schemas['InvIn'], 'valor_actual' | 'valor_actualizado_en' | 'tasa_tipo' | 'crear_tx'>
export type InvRendimiento = Opcional<Schemas['InvRendimiento'], 'fecha' | 'op_clave'>
export type InvAporte = Opcional<Schemas['InvAporte'], 'nuevo_valor' | 'fecha'>
export type InvRetiro = Opcional<Schemas['InvRetiro'], 'saldo_queda' | 'fecha'>
export type InvValor = Opcional<Schemas['InvValor'], 'fecha'>
export type ResumenInversiones = Schemas['ResumenInversiones']
export type PreviewAporte = Schemas['PreviewAporte']
export type PreviewValor = Schemas['PreviewValor']

export type Activo = Schemas['Activo']
export type ActivoIn = Opcional<Schemas['ActivoIn'], 'valor_actual' | 'fecha_adquisicion' | 'valor_actualizado_en' | 'crear_tx'>
export type ActivoVenta = Opcional<Schemas['ActivoVenta'], 'fecha'>
export type ActivoValor = Opcional<Schemas['ActivoValor'], 'fecha'>
export type ResumenActivos = Schemas['ResumenActivos']
export type PreviewVenta = Schemas['PreviewVenta']

export type Recurrente = Schemas['Recurrente']
export type RecIn = Opcional<Schemas['RecIn'], 'activo'>
export type ResumenRecurrentes = Schemas['ResumenRecurrentes']
