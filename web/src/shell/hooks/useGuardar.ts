import { errMsg } from '@/lib/format'
import { useModal } from '@/shell/providers/ModalProvider'

export function useGuardar() {
  const { setModalStatus } = useModal()
  return async (accion: () => Promise<unknown>) => {
    setModalStatus('', 'Guardando...')
    try {
      await accion()
    } catch (err) {
      setModalStatus('err', errMsg(err))
    }
  }
}
