import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { agregarCategoria, quitarCategoria } from '../lib/api'
import type { TipoTx } from '../types'
import { useData } from './DataProvider'

export type NombresCategorias = Record<TipoTx, string[]>

export interface CategoriasApi {
  categorias: NombresCategorias
  esSistema: (tipo: TipoTx, nombre: string) => boolean
  addCategoria: (tipo: TipoTx, nombre: string) => Promise<boolean>
  removeCategoria: (tipo: TipoTx, nombre: string) => Promise<void>
}

const CategoriasContext = createContext<CategoriasApi | null>(null)

export function useCategorias(): CategoriasApi {
  const ctx = useContext(CategoriasContext)
  if (!ctx) throw new Error('useCategorias fuera de CategoriasProvider')
  return ctx
}

export function CategoriasProvider({ children }: { children: ReactNode }) {
  const { estado, reload, showBanner } = useData()
  const origen = estado.categorias

  const categorias = useMemo<NombresCategorias>(
    () => ({
      ingreso: origen.ingreso.map((c) => c.nombre),
      gasto: origen.gasto.map((c) => c.nombre),
      transfer: origen.transfer.map((c) => c.nombre),
    }),
    [origen],
  )

  const esSistema = useCallback(
    (tipo: TipoTx, nombre: string) => origen[tipo].some((c) => c.nombre === nombre && c.sistema),
    [origen],
  )

  const mutar = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn()
      } catch (err) {
        showBanner(err instanceof Error ? err.message : String(err))
        return false
      }
      await reload()
      return true
    },
    [reload, showBanner],
  )

  const addCategoria = useCallback((tipo: TipoTx, nombre: string) => mutar(() => agregarCategoria(tipo, nombre)), [mutar])

  const removeCategoria = useCallback(
    async (tipo: TipoTx, nombre: string) => {
      await mutar(() => quitarCategoria(tipo, nombre))
    },
    [mutar],
  )

  const value = useMemo(
    () => ({ categorias, esSistema, addCategoria, removeCategoria }),
    [categorias, esSistema, addCategoria, removeCategoria],
  )
  return <CategoriasContext.Provider value={value}>{children}</CategoriasContext.Provider>
}
