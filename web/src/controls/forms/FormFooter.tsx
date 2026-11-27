import { useEffect, useRef } from 'react'
import { useModal } from '@/shell/providers/ModalProvider'
import { FormStatus } from '@/controls/forms/FormStatus'
import { useRegistrarGuardado } from '@/controls/forms/FormModal'

type Props = {
  saveLabel: string
  onSave: () => void
  onEdit?: () => void
  editLabel?: string
  onDelete?: () => void
  peligro?: boolean
}

export function FormFooter({ saveLabel, onSave, onEdit, editLabel, onDelete, peligro = false }: Props) {
  const { closeModal } = useModal()
  const registrar = useRegistrarGuardado()
  const guardarActual = useRef(onSave)
  useEffect(() => {
    guardarActual.current = onSave
  })
  useEffect(() => {
    if (!registrar) return
    registrar(() => guardarActual.current())
    return () => registrar(null)
  }, [registrar])
  return (
    <>
      <div className="modal-footer">
        <button type={registrar ? 'submit' : 'button'} className={peligro ? 'btn btn-danger' : 'btn btn-accent'} onClick={registrar ? undefined : onSave}>
          {saveLabel}
        </button>
        {onEdit && (
          <button type="button" className="btn btn-dim" onClick={onEdit}>
            {editLabel}
          </button>
        )}
        {onDelete && (
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            Eliminar
          </button>
        )}
        <button type="button" className="btn btn-dim" onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}
