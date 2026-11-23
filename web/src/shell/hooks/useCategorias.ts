import { useCallback, useMemo } from 'react'
import { agregarCategoria, quitarCategoria } from '@/lib/api'
import { errMsg } from '@/lib/format'
import { useData } from '@/shell/providers/DataProvider'
import type { Categorias, TipoTx } from '@/types'

export interface CategoriasApi {
  categorias: Categorias
  addCategoria: (tipo: TipoTx, nombre: string) => Promise<boolean>
  removeCategoria: (tipo: TipoTx, nombre: string) => Promise<void>
}

export function useCategorias(): CategoriasApi {
  const { estado, reload, showBanner } = useData()

  const mutar = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn()
      } catch (err) {
        showBanner(errMsg(err))
        return false
      }
      await reload(['categorias'])
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

  return useMemo(
    () => ({ categorias: estado.categorias, addCategoria, removeCategoria }),
    [estado.categorias, addCategoria, removeCategoria],
  )
}
