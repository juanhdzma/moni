import { errMsg } from '@/lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useModal, type ModalApi } from '@/shell/providers/ModalProvider'

export interface OpenerCtx {
  openModal: ModalApi['openModal']
  setPendingProxOp: ModalApi['setPendingProxOp']
  showBanner: (msg: string) => void
}

export function useOpenerCtx(): OpenerCtx {
  const { openModal, setPendingProxOp } = useModal()
  const { showBanner } = useData()
  return { openModal, setPendingProxOp, showBanner }
}

export function openConFila<T>(ctx: OpenerCtx, cargar: () => Promise<T>, abrir: (fila: T) => void): void {
  cargar().then(abrir, (err: unknown) => ctx.showBanner(errMsg(err)))
}
