import { useEffect } from 'react'
import { useModal } from '@/shell/providers/ModalProvider'
import { FormStatus } from '@/controls/forms/FormStatus'
import { useRegistrarGuardado } from '@/controls/forms/FormModal'

type Props = {
  saveLabel: string
  onSave: () => void
  onEdit?: () => void
  editLabel?: string
  onDelete?: () => void
  cancelClassName?: string
  peligro?: boolean
}

export function FormFooter({ saveLabel, onSave, onEdit, editLabel, onDelete, cancelClassName, peligro = false }: Props) {
  const { closeModal } = useModal()
  const registrar = useRegistrarGuardado()
  useEffect(() => {
    if (!registrar) return
    registrar(onSave)
    return () => registrar(null)
  })
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
        <button type="button" className={cancelClassName ? `btn btn-dim ${cancelClassName}` : 'btn btn-dim'} onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}
