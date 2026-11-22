import type {
  EsteMes,
  Evolucion,
  FiltrosTx,
  GastosPeriodo,
  ListadoTx,
  Movimientos,
  PeriodoEvolucion,
  PeriodoGastos,
  ProximasOperaciones,
  ResumenDashboard,
  SerieEvolucion,
} from '../../types'
import { get, query } from './client'

export const cargarResumenDashboard = () => get<ResumenDashboard>('/api/dashboard/resumen')
export const cargarEvolucion = (serie: SerieEvolucion, periodo: PeriodoEvolucion) =>
  get<Evolucion>(`/api/dashboard/evolucion${query({ serie, periodo })}`)
export const cargarEsteMes = () => get<EsteMes>('/api/dashboard/este-mes')
export const cargarGastos = (periodo: PeriodoGastos) => get<GastosPeriodo>(`/api/dashboard/gastos${query({ periodo })}`)
export const cargarMovimientos = (n?: number) => get<Movimientos>(`/api/dashboard/movimientos${query({ n })}`)
export const cargarProximasOperaciones = () => get<ProximasOperaciones>('/api/proximas-operaciones')
export const cargarListadoTx = (f: FiltrosTx = {}) => get<ListadoTx>(`/api/tx${query({ ...f })}`)
