import type { Deuda, Estado, Inversion, Transaccion } from '../types'
import { isoMonth, normDate, txMonth } from './format'
import { tieneSaldo } from './config'

export const esGastoCartera = (t: Pick<Transaccion, 'tipo' | 'tarjeta_id'>): boolean =>
  t.tipo === 'gasto' && !t.tarjeta_id

type Flujo = (list: Transaccion[]) => number

export function flujoCartera(list: Pick<Transaccion, 'tipo' | 'tarjeta_id' | 'monto'>[]): number {
  return list.reduce((s, t) => {
    if (t.tipo === 'ingreso') return s + t.monto
    if (esGastoCartera(t)) return s - t.monto
    if (t.tipo === 'transfer') return s - t.monto
    return s
  }, 0)
}

export const CATEGORIAS_NEUTRAS_PATRIMONIO = new Set<string>([
  'Pago deuda',
  'Inversión',
  'Compra activos',
  'Crédito recibido',
  'Avance de tarjeta',
  'Venta activos',
  'Dividendos',
])

// Un gasto con tarjeta resta porque sube la deuda; las revalorizaciones no dejan transacción.
export function flujoPatrimonio(list: Pick<Transaccion, 'tipo' | 'categoria' | 'monto'>[]): number {
  return list.reduce((s, t) => {
    if (CATEGORIAS_NEUTRAS_PATRIMONIO.has(t.categoria)) return s
    if (t.tipo === 'ingreso') return s + t.monto
    if (t.tipo === 'gasto') return s - t.monto
    return s
  }, 0)
}

export function netWorth(
  e: Pick<Estado, 'transacciones' | 'inversiones' | 'activos' | 'deudas'>,
): number {
  return (
    flujoCartera(e.transacciones) +
    e.inversiones.reduce((s, i) => s + i.valor_actual, 0) +
    e.activos.reduce((s, a) => s + a.valor_actual, 0) -
    e.deudas.reduce((s, d) => s + d.saldo_actual, 0)
  )
}

export function monthlySeries(
  transacciones: Transaccion[],
  count: number,
  flujo: Flujo,
  now: Date = new Date(),
): number[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    const m = isoMonth(d)
    return flujo(transacciones.filter((t) => txMonth(t) === m))
  })
}

export function monthlyPatrimonio(transacciones: Transaccion[], count = 7, now: Date = new Date()): number[] {
  return monthlySeries(transacciones, count, flujoPatrimonio, now)
}

// Los rendimientos no entran: pagados no cambian el valor, capitalizados no dejan transacción.
export function monthlyInvDelta(transacciones: Transaccion[], count: number, now: Date = new Date()): number[] {
  return monthlySeries(
    transacciones,
    count,
    (tx) =>
      tx.reduce((s, t) => {
        if (t.categoria === 'Inversión') return s + t.monto
        if (t.categoria === 'Dividendos') return s - t.monto
        return s
      }, 0),
    now,
  )
}

export function serieHaciaAtras(final: number, deltas: number[]): number[] {
  const count = deltas.length
  const data = new Array<number>(count)
  data[count - 1] = final
  for (let i = count - 2; i >= 0; i--) data[i] = (data[i + 1] ?? 0) - (deltas[i + 1] ?? 0)
  return data
}

export function monthLabels(count: number, now: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return d.toLocaleDateString('es-CO', { month: 'short' })
  })
}

export type PeriodoEvolucion = '1M' | '3M' | '6M' | '1Y' | 'ALL'

export function periodMonths(period: string, extraDates: (string | null | undefined)[] = [], now: Date = new Date()): number {
  if (period === '1M') return 2
  if (period === '3M') return 3
  if (period === '6M') return 6
  if (period === '1Y') return 12
  const dates = extraDates.filter((d): d is string => !!d).sort()
  const first = dates[0]
  if (!first) return 6
  const m = first.match(/^(\d{4})-(\d{2})/)
  if (!m) return 6
  const earliest = new Date(+(m[1] ?? 0), +(m[2] ?? 0) - 1, 1)
  return Math.max((now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1, 2)
}

export function fechasTransacciones(transacciones: Transaccion[]): string[] {
  return transacciones.map((t) => normDate(t.fecha).slice(0, 10))
}

export function fechasInversiones(inversiones: Inversion[]): (string | null)[] {
  return inversiones.map((i) => (i.fecha_inicio ? normDate(i.fecha_inicio).slice(0, 10) : null))
}

export interface ResumenDashboard {
  ingresos: number
  gastos: number
  totalDeuda: number
  totalInv: number
  totalActivos: number
  efectivo: number
  patrimonio: number
  proyDelta: number
  deudasActivas: Deuda[]
  cuotaTotal: number
  totalInvertido: number
  gananciaInv: number
  ganPct: number
  ahorroPct: number
}

export function resumenDashboard(e: Estado, now: Date = new Date()): ResumenDashboard {
  const curM = isoMonth(now)
  const cur = e.transacciones.filter((t) => txMonth(t) === curM)

  const ingresos = cur.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0)
  const gastos = cur.filter(esGastoCartera).reduce((s, t) => s + t.monto, 0)

  const totalDeuda = e.deudas.reduce((s, d) => s + d.saldo_actual, 0)
  const totalInv = e.inversiones.reduce((s, i) => s + i.valor_actual, 0)
  const totalActivos = e.activos.reduce((s, a) => s + a.valor_actual, 0)

  const ultimos12 = monthlyPatrimonio(e.transacciones, 12, now)
  const avgMonthly = ultimos12.reduce((s, v) => s + v, 0) / ultimos12.length

  const deudasActivas = e.deudas.filter(tieneSaldo)
  const totalInvertido = e.inversiones.reduce((s, i) => s + i.monto_invertido, 0)
  const gananciaInv = totalInv - totalInvertido

  return {
    ingresos,
    gastos,
    totalDeuda,
    totalInv,
    totalActivos,
    efectivo: flujoCartera(e.transacciones),
    patrimonio: netWorth(e),
    proyDelta: avgMonthly * 12,
    deudasActivas,
    cuotaTotal: deudasActivas.reduce((s, d) => s + d.cuota_mensual, 0),
    totalInvertido,
    gananciaInv,
    ganPct: totalInvertido > 0 ? (gananciaInv / totalInvertido) * 100 : 0,
    ahorroPct: ingresos > 0 ? (flujoCartera(cur) / ingresos) * 100 : 0,
  }
}

export function transaccionesRecientes(transacciones: Transaccion[], n = 20): Transaccion[] {
  return [...transacciones].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, n)
}

export type PeriodoGastos = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'

function restarMeses(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth() - n, 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds())
  r.setDate(Math.min(d.getDate(), new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()))
  return r
}

function fechaHoraLocal(fecha: string): Date | null {
  const [dia, hora] = normDate(fecha).split('T')
  const m = (dia ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const [hh, mm] = (hora ?? '0:0').split(':')
  return new Date(+(m[1] ?? 0), +(m[2] ?? 0) - 1, +(m[3] ?? 0), +(hh ?? 0), +(mm ?? 0))
}

export function gastosTxInPeriod(transacciones: Transaccion[], period: string, hoy: Date = new Date()): Transaccion[] {
  const gastos = transacciones.filter((t) => t.tipo === 'gasto')
  const now = new Date(hoy)
  now.setHours(23, 59, 59, 999)
  let from = new Date(now)
  if (period === '1W') from.setDate(from.getDate() - 7)
  else if (period === '1M') from = restarMeses(from, 1)
  else if (period === '3M') from = restarMeses(from, 3)
  else if (period === '6M') from = restarMeses(from, 6)
  else if (period === '1Y') from = restarMeses(from, 12)
  else return gastos
  from.setHours(0, 0, 0, 0)
  return gastos.filter((t) => {
    const d = fechaHoraLocal(t.fecha)
    return d !== null && d >= from
  })
}

export function redHeat(t: number): string {
  return `hsl(7, 64%, ${86 - t * 56}%)`
}

export function agruparGastos(txs: Transaccion[]): { entries: [string, number][]; porCategoria: Record<string, Transaccion[]> } {
  const grouped: Record<string, number> = {}
  const porCategoria: Record<string, Transaccion[]> = {}
  txs.forEach((t) => {
    const k = t.categoria || 'Otros'
    grouped[k] = (grouped[k] ?? 0) + t.monto
    ;(porCategoria[k] ??= []).push(t)
  })
  return { entries: Object.entries(grouped).sort((a, b) => b[1] - a[1]), porCategoria }
}
