import { cop } from '../../lib/format'
import type { Transaccion } from '../../types'

export function fraseTransacciones(list: Transaccion[], filtrado: boolean): string {
  if (!list.length) return ''
  const ingresos = list.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0)
  const gastos = list.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0)
  const neto = ingresos - gastos
  const n = list.length === 1 ? '1 movimiento' : `${list.length} movimientos`
  const que = filtrado ? `${n} con estos filtros` : n
  const signo = neto > 0 ? 'te dejaron ' + cop(neto) : neto < 0 ? 'te costaron ' + cop(-neto) : 'quedaron en cero'
  return `${que}: ingresaron ${cop(ingresos)}, salieron ${cop(gastos)} y ${signo}.`
}
