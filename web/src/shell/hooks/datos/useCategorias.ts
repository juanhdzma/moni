import { useCallback, useMemo } from 'react'
import { agregarCategoria, quitarCategoria, type AlAfectar } from '@/lib/api'
import { useData } from '@/shell/providers/DataProvider'
import type { Categorias, TipoTx } from '@/types'

interface CategoriasApi {
  categorias: Categorias
  addCategoria: (tipo: TipoTx, nombre: string) => Promise<boolean>
  removeCategoria: (tipo: TipoTx, nombre: string) => Promise<void>
}

export function useCategorias(): CategoriasApi {
  const { estado, mutar: aplicar, conBanner } = useData()

  const mutar = useCallback(
    (cambio: (onAfectadas: AlAfectar) => Promise<unknown>) => conBanner(() => aplicar(cambio)),
    [aplicar, conBanner],
  )

  const addCategoria = useCallback((tipo: TipoTx, nombre: string) => mutar((o) => agregarCategoria(tipo, nombre, o)), [mutar])

  const removeCategoria = useCallback(
    async (tipo: TipoTx, nombre: string) => {
      await mutar((o) => quitarCategoria(tipo, nombre, o))
    },
    [mutar],
  )

  return useMemo(
    () => ({ categorias: estado.categorias, addCategoria, removeCategoria }),
    [estado.categorias, addCategoria, removeCategoria],
  )
}
