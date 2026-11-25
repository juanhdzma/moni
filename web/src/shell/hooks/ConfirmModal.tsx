interface Props {
  mensaje: string
  onConfirmar: () => void
  onCancelar: () => void
}

export function ConfirmModal({ mensaje, onConfirmar, onCancelar }: Props) {
  return (
    <>
      <p className="mb-4 text-sm">{mensaje}</p>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-dim" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirmar}>
          Eliminar
        </button>
      </div>
    </>
  )
}
