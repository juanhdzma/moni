import type { Opcional, Schemas } from './gen'

export type Inversion = Schemas['Inversion']
export type InvIn = Opcional<Schemas['InvIn'], 'valor_actual' | 'valor_actualizado_en' | 'tasa_tipo' | 'crear_tx'>
export type InvRendimiento = Opcional<Schemas['InvRendimiento'], 'op_clave'>
export type InvAporte = Opcional<Schemas['InvAporte'], 'nuevo_valor'>
export type InvRetiro = Opcional<Schemas['InvRetiro'], 'saldo_queda'>
export type InvValor = Opcional<Schemas['InvValor'], 'fecha'>
export type ResumenInversiones = Schemas['ResumenInversiones']
export type PreviewAporte = Schemas['PreviewAporte']
export type PreviewValor = Schemas['PreviewValor']
