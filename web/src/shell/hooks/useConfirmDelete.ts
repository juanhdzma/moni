import type { CrudEntity } from '@/types'
import { useMutations } from './useMutations'

export function useConfirmDelete(entidad: CrudEntity, fila: { id: number } | null, mensaje: string): (() => void) | undefined {
  const { crudOpOrBanner } = useMutations()
  if (!fila) return undefined
  return () => {
    if (confirm(mensaje)) void crudOpOrBanner(entidad, 'delete', { id: fila.id })
  }
}
