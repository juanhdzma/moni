import type { Segmento } from '@/components/panel'
import type { Transaccion } from '../../types'

export function resumenTx(list: Transaccion[]): { ingresos: number; gastos: number; neto: number; categorias: Segmento[] } {
  let ingresos = 0
  let gastos = 0
  const porCat = new Map<string, number>()
  for (const t of list) {
    if (t.tipo === 'ingreso') ingresos += t.monto
    if (t.tipo === 'gasto') {
      gastos += t.monto
      porCat.set(t.categoria, (porCat.get(t.categoria) ?? 0) + t.monto)
    }
  }
  const categorias = [...porCat].map(([c, v]) => ({ key: c, label: c, valor: v }))
  return { ingresos, gastos, neto: ingresos - gastos, categorias }
}
