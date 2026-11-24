import { useModal } from '@/shell/providers/ModalProvider'
import { FormStatus } from './FormStatus'

type Props = {
  saveLabel: string
  onSave: () => void
  onEdit?: () => void
  editLabel?: string
  onDelete?: () => void
  cancelClassName?: string
}

export function FormFooter({ saveLabel, onSave, onEdit, editLabel, onDelete, cancelClassName }: Props) {
  const { closeModal } = useModal()
  return (
    <>
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={onSave}>
          {saveLabel}
        </button>
        {onEdit && (
          <button className="btn btn-dim" onClick={onEdit}>
            {editLabel}
          </button>
        )}
        {onDelete && (
          <button className="btn btn-danger" onClick={onDelete}>
            Eliminar
          </button>
        )}
        <button className={cancelClassName ? `btn btn-dim ${cancelClassName}` : 'btn btn-dim'} onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}
