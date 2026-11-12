import type { Deuda } from '../types'
import { cop } from './format'

export interface InteresesInfo {
  valor: number
  exacto: boolean
}

export function estimarInteresesPagados(
  montoInicial: number,
  saldoActual: number,
  tasaEA: number,
  cuotaMensual: number,
): number | null {
  if (!tasaEA || !cuotaMensual || !montoInicial || saldoActual >= montoInicial) return null
  const tasaMV = Math.pow(1 + tasaEA / 100, 1 / 12) - 1
  let saldo = montoInicial
  let totalIntereses = 0
  for (let i = 0; i < 600 && saldo > saldoActual + 1; i++) {
    const interesMes = saldo * tasaMV
    const capitalMes = cuotaMensual - interesMes
    if (capitalMes <= 0) break
    totalIntereses += interesMes
    saldo -= capitalMes
  }
  return Math.round(totalIntereses)
}

export function interesesPagados(
  d: Pick<Deuda, 'total_intereses' | 'monto_inicial' | 'saldo_actual' | 'tasa_ea' | 'cuota_mensual'>,
): InteresesInfo | null {
  if (d.total_intereses > 0) return { valor: d.total_intereses, exacto: true }
  const est = estimarInteresesPagados(d.monto_inicial, d.saldo_actual, d.tasa_ea, d.cuota_mensual)
  return est === null ? null : { valor: est, exacto: false }
}

export function fmtIntereses(info: InteresesInfo): string {
  return (info.exacto ? '' : '~') + cop(info.valor)
}

export function desglosePago(saldoAnterior: number, total: number, saldoNuevo: number) {
  const capital = Math.max(0, saldoAnterior - saldoNuevo)
  const intereses = Math.max(0, total - capital)
  return { capital, intereses }
}

export function comisionAdelanto(saldoAnterior: number, monto: number, saldoNuevo: number): number {
  return Math.max(0, saldoNuevo - saldoAnterior - monto)
}
