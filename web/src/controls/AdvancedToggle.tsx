interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  hint?: string
}

export function AdvancedToggle({
  checked,
  onChange,
  label = 'Registrar como nuevo en transacciones',
  hint = 'Desactivá si ya lo tenías antes de usar Moni.',
}: Props) {
  return (
    <details className="advanced-toggle">
      <summary>
        <span>▸</span> Opciones de registro
      </summary>
      <div className="advanced-body">
        <label>
          <input type="checkbox" id="m-es-nueva" checked={checked} onChange={(e) => onChange(e.target.checked)} />
          {label}
        </label>
        <div className="hint">{hint}</div>
      </div>
    </details>
  )
}
