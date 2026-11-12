import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  addCustomCategory,
  loadCustomCategories,
  removeCustomCategory,
  type Categorias,
} from '../lib/config'
import type { TipoTx } from '../types'

export interface CategoriasApi {
  categorias: Categorias
  addCategoria: (tipo: TipoTx, nombre: string) => boolean
  removeCategoria: (tipo: TipoTx, nombre: string) => void
}

const CategoriasContext = createContext<CategoriasApi | null>(null)

export function useCategorias(): CategoriasApi {
  const ctx = useContext(CategoriasContext)
  if (!ctx) throw new Error('useCategorias fuera de CategoriasProvider')
  return ctx
}

export function CategoriasProvider({ children }: { children: ReactNode }) {
  const [categorias, setCategorias] = useState<Categorias>(loadCustomCategories)

  const addCategoria = useCallback(
    (tipo: TipoTx, nombre: string) => {
      const next = addCustomCategory(categorias, tipo, nombre)
      if (!next) return false
      setCategorias(next)
      return true
    },
    [categorias],
  )

  const removeCategoria = useCallback(
    (tipo: TipoTx, nombre: string) => {
      const next = removeCustomCategory(categorias, tipo, nombre)
      if (next !== categorias) setCategorias(next)
    },
    [categorias],
  )

  const value = useMemo(() => ({ categorias, addCategoria, removeCategoria }), [categorias, addCategoria, removeCategoria])
  return <CategoriasContext.Provider value={value}>{children}</CategoriasContext.Provider>
}
