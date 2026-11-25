import type { Opcional, Schemas } from './gen'

export type ModoPago = keyof Schemas['PagoSugerido']
export type Deuda = Schemas['Deuda']
export type DeudaIn = Opcional<Schemas['DeudaIn'], 'tasa_tipo'> & { crear_tx?: boolean }
export type DeudaPago = Opcional<Schemas['DeudaPago'], 'intereses' | 'fecha' | 'descripcion' | 'op_clave'>
export type DeudaAdelanto = Opcional<Schemas['DeudaAdelanto'], 'nuevo_saldo' | 'disponible_nuevo' | 'fecha' | 'descripcion' | 'op_clave'>
export type ResumenDeudas = Schemas['ResumenDeudas']
export type PreviewPago = Schemas['PreviewPago']
export type PreviewAdelanto = Schemas['PreviewAdelanto']
