import { useState, type ReactNode } from 'react'
import { ApiError } from '@/lib/api'
import { errMsg } from '@/lib/format'
import { Campo } from '@/controls/Campo'
import { FormFooter } from '@/controls/FormFooter'
import { FormModal } from '@/controls/FormModal'
import { useModal } from '@/shell/providers/ModalProvider'

interface Props {
  descripcion: ReactNode
  etiqueta: string
  peligro?: boolean
  extra?: ReactNode
  validar?: () => string | null
  onConfirmar: (clave: string) => Promise<unknown>
}

export const CLAVE_REQUERIDA = 'Ingresá tu clave para confirmar esta acción'

const mensajeDe = (err: unknown): string => (err instanceof ApiError && err.textoBloqueo ? err.textoBloqueo : errMsg(err))

export function ConfirmarClave({ descripcion, etiqueta, peligro = false, extra, validar, onConfirmar }: Props) {
  const { closeModal, setModalStatus } = useModal()
  const [clave, setClave] = useState('')

  const confirmar = async () => {
    const invalido = validar?.() ?? (clave ? null : CLAVE_REQUERIDA)
    if (invalido) {
      setModalStatus('err', invalido)
      return
    }
    setModalStatus('', 'Procesando...')
    try {
      await onConfirmar(clave)
      closeModal()
    } catch (err) {
      setModalStatus('err', mensajeDe(err))
    }
  }

  return (
    <FormModal>
      <div className="mb-4 text-sm text-muted-foreground">{descripcion}</div>
      {extra}
      <Campo id="m-clave" label="Clave">
        <input
          className="form-input"
          type="password"
          id="m-clave"
          autoComplete="current-password"
          maxLength={256}
          value={clave}
          onChange={(e) => setClave(e.target.value)}
        />
      </Campo>
      <FormFooter saveLabel={etiqueta} onSave={() => void confirmar()} peligro={peligro} />
    </FormModal>
  )
}
