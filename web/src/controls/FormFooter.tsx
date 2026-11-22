import { useModal } from '@/shell/providers/ModalProvider'
import { FormStatus } from './FormStatus'

type Props = {
  saveLabel: string
  onSave: () => void
  onEdit?: () => void
  editLabel?: string
  onDelete?: () => void
  cancelClassName?: string
  buttonType?: 'button'
}

export function FormFooter({ saveLabel, onSave, onEdit, editLabel, onDelete, cancelClassName, buttonType }: Props) {
  const { closeModal } = useModal()
  return (
    <>
      <div className="modal-footer">
        <button type={buttonType} className="btn btn-accent" onClick={onSave}>
          {saveLabel}
        </button>
        {onEdit && (
          <button type={buttonType} className="btn btn-dim" onClick={onEdit}>
            {editLabel}
          </button>
        )}
        {onDelete && (
          <button type={buttonType} className="btn btn-danger" onClick={onDelete}>
            Eliminar
          </button>
        )}
        <button type={buttonType} className={cancelClassName ? `btn btn-dim ${cancelClassName}` : 'btn btn-dim'} onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}
