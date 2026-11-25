import { ChevronRight } from 'lucide-react'
import { useId } from 'react'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint: string
}

function OpcionesDeRegistro({ checked, onChange, label, hint }: Props) {
  const hintId = useId()
  return (
    <details className="advanced-toggle">
      <summary>
        <span aria-hidden="true">
          <ChevronRight className="size-3.5" />
        </span>{' '}
        Opciones de registro
      </summary>
      <div className="advanced-body">
        <label>
          <input type="checkbox" id="m-es-nueva" checked={checked} aria-describedby={hintId} onChange={(e) => onChange(e.target.checked)} />
          {label}
        </label>
        <div className="hint" id={hintId}>
          {hint}
        </div>
      </div>
    </details>
  )
}

type Simple = Pick<Props, 'checked' | 'onChange'> & { label?: string }

export function CrearTxToggle({ checked, onChange, label = 'Registrar como nuevo en transacciones' }: Simple) {
  return <OpcionesDeRegistro checked={checked} onChange={onChange} label={label} hint="Desactivá si ya lo tenías antes de usar Moni." />
}

export function RegistrarToggle({ checked, onChange, label = 'Registrar en transacciones' }: Simple) {
  return <OpcionesDeRegistro checked={checked} onChange={onChange} label={label} hint="Desactivá si ya lo registraste en otra parte." />
}

export const AdvancedToggle = CrearTxToggle
