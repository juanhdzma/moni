import type { Schemas } from './gen'

export type TonoFrase = Schemas['ParteFrase']['tono']
export type Frase = Schemas['Frase']

export type ParteResumen = Schemas['ParteResumen']
export type ResumenDashboard = Schemas['ResumenDashboard']
export type EsteMes = Schemas['EsteMes']
export type GastosPeriodo = Schemas['GastosPeriodo']
export type Movimientos = Schemas['Movimientos']
export type Evolucion = Schemas['Evolucion']

export type SerieEvolucion = Evolucion['serie']
export type PeriodoEvolucion = Evolucion['periodo']
export type PeriodoGastos = GastosPeriodo['periodo']
