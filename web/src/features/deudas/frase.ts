import { cop } from '../../lib/format'
import type { Deuda } from '../../types'

export function mesesParaSaldar(creditos: Pick<Deuda, 'saldo_actual' | 'cuota_mensual'>[]): number | null {
  const meses = creditos.filter((d) => d.cuota_mensual > 0).map((d) => Math.ceil(d.saldo_actual / d.cuota_mensual))
  return meses.length ? Math.max(...meses) : null
}

export function fraseDeudas(total: number, hayActivas: boolean, meses: number | null): string {
  if (!hayActivas) return 'No tenés deudas activas.'
  const base = `Debés ${cop(total)} entre créditos y tarjetas`
  return meses ? `${base}; con las cuotas de hoy saldás los créditos en ~${meses} ${meses === 1 ? 'mes' : 'meses'}.` : `${base}.`
}
