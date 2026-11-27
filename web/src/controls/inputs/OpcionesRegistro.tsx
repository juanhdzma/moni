import { ChevronRight } from 'lucide-react'
import { useId } from 'react'
import { useMeta } from '@/shell/hooks/datos/useMeta'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

function OpcionesDeRegistro({ checked, onChange, label, hint, inputId }: Props & { hint?: string; inputId?: string }) {
  const hintId = useId()
  const titulo = useMeta()?.textos.registro.titulo
  return (
    <details className="advanced-toggle">
      <summary>
        <span aria-hidden="true">
          <ChevronRight className="size-3.5" />
        </span>{' '}
        {titulo}
      </summary>
      <div className="advanced-body">
        <label>
          <input type="checkbox" id={inputId} checked={checked} aria-describedby={hintId} onChange={(e) => onChange(e.target.checked)} />
          {label}
        </label>
        <div className="hint" id={hintId}>
          {hint}
        </div>
      </div>
    </details>
  )
}

export function CrearTxToggle({ checked, onChange, label }: Props) {
  const t = useMeta()?.textos.registro
  return <OpcionesDeRegistro checked={checked} onChange={onChange} label={label ?? t?.label_crear_tx} hint={t?.hint_crear_tx} inputId="m-es-nueva" />
}

export function RegistrarToggle({ checked, onChange, label }: Props) {
  const t = useMeta()?.textos.registro
  return <OpcionesDeRegistro checked={checked} onChange={onChange} label={label ?? t?.label_registrar_tx} hint={t?.hint_registrar_tx} inputId="m-es-nueva" />
}
