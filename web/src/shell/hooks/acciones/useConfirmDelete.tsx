import type { CrudEntity } from '@/types'
import { useModal } from '@/shell/providers/ModalProvider'
import { ConfirmModal } from '@/shell/hooks/acciones/ConfirmModal'
import { useMutations } from '@/shell/hooks/acciones/useMutations'

export function useConfirmDelete(entidad: CrudEntity, fila: { id: number } | null, mensaje: string): (() => void) | undefined {
  const { crudOpOrBanner } = useMutations()
  const { pushModal, popModal, closeModal } = useModal()
  if (!fila) return undefined
  const borrar = () => {
    closeModal()
    void crudOpOrBanner(entidad, 'delete', { id: fila.id })
  }
  return () => pushModal('Confirmar eliminación', <ConfirmModal mensaje={mensaje} onConfirmar={borrar} onCancelar={popModal} />)
}
