import type { Opcional, Schemas } from './gen'

export type Activo = Schemas['Activo']
export type ActivoIn = Opcional<Schemas['ActivoIn'], 'valor_actual' | 'fecha_adquisicion' | 'valor_actualizado_en' | 'crear_tx'>
export type ActivoVenta = Opcional<Schemas['ActivoVenta'], 'fecha'>
export type ActivoValor = Opcional<Schemas['ActivoValor'], 'fecha'>
export type ResumenActivos = Schemas['ResumenActivos']
export type PreviewVenta = Schemas['PreviewVenta']
