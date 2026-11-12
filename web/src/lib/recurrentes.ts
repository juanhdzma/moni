import type { Frecuencia } from '../types'
import { fechaLocal } from './format'

interface FrecuenciaInfo {
  label: string
  factor: number
  dias?: number
  meses?: number
}

export const FRECUENCIAS: Record<Frecuencia, FrecuenciaInfo> = {
  semanal: { label: 'Semanal', factor: 52 / 12, dias: 7 },
  quincenal: { label: 'Quincenal', factor: 2, dias: 14 },
  mensual: { label: 'Mensual', factor: 1, meses: 1 },
  bimestral: { label: 'Bimestral', factor: 1 / 2, meses: 2 },
  trimestral: { label: 'Trimestral', factor: 1 / 3, meses: 3 },
  semestral: { label: 'Semestral', factor: 1 / 6, meses: 6 },
  anual: { label: 'Anual', factor: 1 / 12, meses: 12 },
}

function frecuenciaInfo(frecuencia: string): FrecuenciaInfo | undefined {
  return Object.hasOwn(FRECUENCIAS, frecuencia) ? FRECUENCIAS[frecuencia as Frecuencia] : undefined
}

export function toMensual(monto: number, frecuencia: string): number {
  return monto * (frecuenciaInfo(frecuencia)?.factor ?? 1)
}

// setMonth(+1) sobre un día 29-31 se desborda al mes siguiente y el recurrente queda corrido: se ancla el día y se recorta al último del mes.
export function sumarMeses(base: Date, n: number, dia: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth() + n, 1)
  d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
  return d
}

export function nextPaymentDate(fechaInicio: string, frecuencia: string, hoy: Date = new Date()): Date | null {
  const start = fechaLocal(fechaInicio)
  if (!start) return null
  const now = new Date(hoy)
  now.setHours(0, 0, 0, 0)
  const frec = frecuenciaInfo(frecuencia)
  if (!frec) return null

  if (frec.dias) {
    const periodos = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (frec.dias * 86400000)))
    const next = new Date(start)
    next.setDate(start.getDate() + periodos * frec.dias)
    return next
  }

  const mesesPeriodo = frec.meses ?? 1
  const dia = start.getDate()
  const meses = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  let k = Math.max(0, Math.ceil(meses / mesesPeriodo))
  let next = sumarMeses(start, k * mesesPeriodo, dia)
  while (next < now) next = sumarMeses(start, ++k * mesesPeriodo, dia)
  return next
}

export function nextPaymentStr(fechaInicio: string, frecuencia: string, hoy: Date = new Date()): string | null {
  const next = nextPaymentDate(fechaInicio, frecuencia, hoy)
  if (!next) return null
  const now = new Date(hoy)
  now.setHours(0, 0, 0, 0)
  const days = Math.round((next.getTime() - now.getTime()) / 86400000)
  if (days === 0) return 'hoy'
  return `en ${days}d`
}
