import { useCallback, useMemo } from 'react'
import { agregarCategoria, quitarCategoria } from '@/lib/api'
import { useData } from '@/shell/providers/DataProvider'
import type { Categorias, TipoTx } from '@/types'

interface CategoriasApi {
  categorias: Categorias
  addCategoria: (tipo: TipoTx, nombre: string) => Promise<boolean>
  removeCategoria: (tipo: TipoTx, nombre: string) => Promise<void>
}

export function useCategorias(): CategoriasApi {
  const { estado, aplicarEstado, conBanner } = useData()

  const mutar = useCallback(
    (cambio: () => Promise<Categorias>) =>
      conBanner(async () => aplicarEstado({ categorias: await cambio() }, ['categorias'])),
    [aplicarEstado, conBanner],
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
