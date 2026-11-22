import type { MigrarLocalIn } from '../types'
import { migrarLocal } from './api'

const CLAVES = ['moni_cats', 'moni_skipped_ops', 'moni_currency_symbol'] as const

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

function parsear(raw: string | null): unknown {
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const textos = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export function leerLocal(): MigrarLocalIn | null {
  if (CLAVES.every((c) => leer(c) === null)) return null
  const cats = parsear(leer('moni_cats'))
  const registro = typeof cats === 'object' && cats !== null && !Array.isArray(cats) ? (cats as Record<string, unknown>) : {}
  return {
    categorias: { ingreso: textos(registro.ingreso), gasto: textos(registro.gasto), transfer: textos(registro.transfer) },
    ops_ocultas: textos(parsear(leer('moni_skipped_ops'))),
    moneda_simbolo: leer('moni_currency_symbol') || null,
  }
}

export async function migrarLocalStorage(): Promise<boolean> {
  const datos = leerLocal()
  if (!datos) return false
  try {
    await migrarLocal(datos)
  } catch {
    return false
  }
  for (const c of CLAVES) {
    try {
      localStorage.removeItem(c)
    } catch {
      continue
    }
  }
  return true
}
