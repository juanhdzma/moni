import type { Deuda, TipoTx } from '../types'

export const SALDO_MINIMO = 1
export const tieneSaldo = (d: Pick<Deuda, 'saldo_actual'>): boolean => d.saldo_actual >= SALDO_MINIMO

export const FRANQUICIA_ICONS: Record<string, string> = {
  Visa: 'assets/franquicias/visa.svg',
  Mastercard: 'assets/franquicias/mastercard.svg',
  Amex: 'assets/franquicias/americanexpress.svg',
  Otra: 'assets/franquicias/otra.svg',
}

export const SYSTEM_CATEGORIES: Record<TipoTx, string[]> = {
  ingreso: ['Crédito recibido', 'Avance de tarjeta', 'Intereses', 'Dividendos', 'Venta activos'],
  gasto: ['Inversión', 'Compra activos'],
  transfer: ['Pago deuda'],
}

export type Categorias = Record<TipoTx, string[]>

const CATS_KEY = 'moni_cats'
const TIPOS: TipoTx[] = ['ingreso', 'gasto', 'transfer']

export function systemCategories(): Categorias {
  return {
    ingreso: [...SYSTEM_CATEGORIES.ingreso],
    gasto: [...SYSTEM_CATEGORIES.gasto],
    transfer: [...SYSTEM_CATEGORIES.transfer],
  }
}

export function isSystemCategory(tipo: TipoTx, nombre: string): boolean {
  return SYSTEM_CATEGORIES[tipo].includes(nombre)
}

function readCustom(): Partial<Record<TipoTx, string[]>> {
  const parsed: unknown = JSON.parse(localStorage.getItem(CATS_KEY) ?? '{}')
  const custom: Partial<Record<TipoTx, string[]>> = {}
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return custom
  for (const tipo of TIPOS) {
    const lista: unknown = (parsed as Record<string, unknown>)[tipo]
    if (Array.isArray(lista)) custom[tipo] = lista.filter((c): c is string => typeof c === 'string')
  }
  return custom
}

export function loadCustomCategories(): Categorias {
  const cats = systemCategories()
  try {
    const custom = readCustom()
    for (const tipo of TIPOS) {
      for (const cat of custom[tipo] ?? []) {
        if (!cats[tipo].includes(cat)) cats[tipo].push(cat)
      }
    }
  } catch {
    return cats
  }
  return cats
}

function persistir(fn: (custom: Partial<Record<TipoTx, string[]>>) => void): void {
  try {
    const custom = readCustom()
    fn(custom)
    localStorage.setItem(CATS_KEY, JSON.stringify(custom))
  } catch {
    return
  }
}

export function addCustomCategory(cats: Categorias, tipo: TipoTx, nombre: string): Categorias | null {
  const limpio = nombre.trim()
  if (!limpio || cats[tipo].includes(limpio)) return null
  persistir((custom) => {
    custom[tipo] = [...(custom[tipo] ?? []), limpio]
  })
  return { ...cats, [tipo]: [...cats[tipo], limpio] }
}

export function removeCustomCategory(cats: Categorias, tipo: TipoTx, nombre: string): Categorias {
  if (isSystemCategory(tipo, nombre)) return cats
  const idx = cats[tipo].indexOf(nombre)
  if (idx < 0) return cats
  persistir((custom) => {
    if (custom[tipo]) custom[tipo] = custom[tipo].filter((c) => c !== nombre)
  })
  return { ...cats, [tipo]: cats[tipo].filter((_, i) => i !== idx) }
}
