import type { Estado } from '@/types'
import { useData } from '@/shell/providers/DataProvider'
import { useModal, type ModalApi } from '@/shell/providers/ModalProvider'

export interface OpenerCtx {
  openModal: ModalApi['openModal']
  setPendingProxOp: ModalApi['setPendingProxOp']
  estado: Estado
}

export function useOpenerCtx(): OpenerCtx {
  const { openModal, setPendingProxOp } = useModal()
  const { estado } = useData()
  return { openModal, setPendingProxOp, estado }
}
