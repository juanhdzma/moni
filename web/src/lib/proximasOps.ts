import type { Estado } from '../types'
import { isoDate, mediodia } from './format'
import { tieneSaldo } from './config'
import { nextInvPaymentDate, rendimientoMensualFija } from './inversiones'
import { FRECUENCIAS, nextPaymentDate } from './recurrentes'

export const PROX_OP_OVERDUE_DAYS = 10
const SKIPPED_KEY = 'moni_skipped_ops'

export type ProxOpType = 'deuda' | 'inversion' | 'recurrente'

export interface ProxOp {
  date: Date
  label: string
  sub: string
  monto: number
  color: string
  type: ProxOpType
  sourceId: number
  dateISO: string
  key: string
}

export const proxOpKey = (type: ProxOpType, sourceId: number, dateISO: string): string =>
  `${type}:${sourceId}:${dateISO}`

export function loadSkippedOps(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SKIPPED_KEY) || '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [])
  } catch {
    return new Set()
  }
}

export function saveSkippedOps(set: Set<string>): void {
  try {
    localStorage.setItem(SKIPPED_KEY, JSON.stringify([...set]))
  } catch {
    return
  }
}

export function skipOp(key: string): void {
  const set = loadSkippedOps()
  set.add(key)
  saveSkippedOps(set)
}

export function restoreOp(key: string): void {
  const set = loadSkippedOps()
  set.delete(key)
  saveSkippedOps(set)
}

export function restoreAllOps(): void {
  saveSkippedOps(new Set())
}

type Candidato = Omit<ProxOp, 'dateISO' | 'key'>

export function calcularProximasOperaciones(
  e: Pick<Estado, 'deudas' | 'inversiones' | 'recurrentes'>,
  hoy: Date = new Date(),
): ProxOp[] {
  const now = new Date(hoy)
  now.setHours(0, 0, 0, 0)
  const past = new Date(now.getTime() - PROX_OP_OVERDUE_DAYS * 86400000)
  const limit = new Date(now.getTime() + 45 * 86400000)
  const events: Candidato[] = []

  e.deudas
    .filter((d) => tieneSaldo(d) && d.proxima_cuota)
    .forEach((d) => {
      const date = mediodia(d.proxima_cuota)
      date.setHours(0, 0, 0, 0)
      if (date >= past && date <= limit)
        events.push({ date, label: d.nombre, sub: 'Cuota deuda', monto: -d.cuota_mensual, color: 'var(--red)', type: 'deuda', sourceId: d._id })
    })

  e.inversiones
    .filter((i) => i.tipo === 'fija' && i.pago === 'mensual' && i.dia_pago && i.tasa_ea)
    .forEach((inv) => {
      const dia = inv.dia_pago ?? 0
      const next = nextInvPaymentDate(dia, hoy)
      if (next <= limit) {
        const rend = rendimientoMensualFija(inv.monto_invertido, inv.tasa_ea ?? 0)
        events.push({ date: next, label: inv.nombre, sub: 'Rendimiento', monto: rend, color: 'var(--green)', type: 'inversion', sourceId: inv._id })
      }
    })

  e.recurrentes
    .filter((r) => r.activo && r.fecha_inicio)
    .forEach((r) => {
      const next = nextPaymentDate(r.fecha_inicio, r.frecuencia, hoy)
      if (next && next >= past && next <= limit) {
        const isIng = r.tipo === 'ingreso'
        const frecLabel = FRECUENCIAS[r.frecuencia]?.label ?? r.frecuencia
        events.push({
          date: next,
          label: r.nombre,
          sub: frecLabel,
          monto: isIng ? r.monto : -r.monto,
          color: isIng ? 'var(--green)' : 'var(--red)',
          type: 'recurrente',
          sourceId: r._id,
        })
      }
    })

  events.sort((a, b) => a.date.getTime() - b.date.getTime())
  return events.map((ev) => {
    const dateISO = isoDate(ev.date)
    return { ...ev, dateISO, key: proxOpKey(ev.type, ev.sourceId, dateISO) }
  })
}

export function visibles(candidatas: ProxOp[]): ProxOp[] {
  const skipped = loadSkippedOps()
  return candidatas.filter((e) => !skipped.has(e.key))
}

export function podarOcultas(candidatas: ProxOp[]): void {
  const keys = new Set(candidatas.map((e) => e.key))
  const skipped = loadSkippedOps()
  const vigentes = [...skipped].filter((k) => keys.has(k))
  if (vigentes.length !== skipped.size) saveSkippedOps(new Set(vigentes))
}

export function diasHasta(date: Date, hoy: Date = new Date()): number {
  const now = new Date(hoy)
  now.setHours(0, 0, 0, 0)
  return Math.round((date.getTime() - now.getTime()) / 86400000)
}

export function textoDias(days: number): string {
  return days === 0 ? 'hoy' : days === 1 ? 'mañana' : days < 0 ? `vencido ${Math.abs(days)}d` : `en ${days}d`
}
