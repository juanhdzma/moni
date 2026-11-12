import type { Transaccion } from '../types'
import { mediodia, txMonth } from './format'

export type TxSortCol = 'fecha' | 'tipo' | 'categoria' | 'descripcion' | 'monto'

export interface TxSort {
  col: TxSortCol
  dir: 1 | -1
}

export function nextSort(actual: TxSort, col: TxSortCol): TxSort {
  if (actual.col === col) return { col, dir: actual.dir === 1 ? -1 : 1 }
  return { col, dir: col === 'fecha' || col === 'monto' ? -1 : 1 }
}

export interface TxFilters {
  tipo?: string
  mes?: string
  cat?: string
}

export function listarTransacciones(transacciones: Transaccion[], sort: TxSort, f: TxFilters = {}): Transaccion[] {
  let list = transacciones
    .filter((t) => t.tipo !== 'transfer')
    .sort((a, b) => {
      if (sort.col === 'monto') return (a.monto - b.monto) * sort.dir
      return String(a[sort.col] ?? '').localeCompare(String(b[sort.col] ?? '')) * sort.dir
    })
  if (f.tipo) list = list.filter((t) => t.tipo === f.tipo)
  if (f.mes) list = list.filter((t) => txMonth(t) === f.mes)
  if (f.cat) list = list.filter((t) => t.categoria === f.cat)
  return list
}

export function mesesDisponibles(transacciones: Transaccion[]): string[] {
  return [...new Set(transacciones.map((t) => txMonth(t)))].sort().reverse()
}

export function categoriasDisponibles(transacciones: Transaccion[]): string[] {
  return [...new Set(transacciones.map((t) => t.categoria))].sort()
}

export function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function txDateBucket(fecha: string, now: Date): string {
  const d = mediodia(fecha)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((today.getTime() - dOnly.getTime()) / 86400000)

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (dOnly >= startOfWeek(today)) return 'Esta semana'
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return 'Este mes'

  const mes = d.toLocaleDateString('es-CO', { month: 'long' })
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} - ${d.getFullYear()}`
}
