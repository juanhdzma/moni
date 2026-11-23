import { MoneyInput } from './MoneyInput'

interface Props {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  hintId?: string
  placeholder?: string
}

export function MoneyField({ id, label, value, onChange, hint, hintId, placeholder }: Props) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <MoneyInput id={id} value={value} onChange={onChange} placeholder={placeholder} />
      {hint && (
        <div id={hintId} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  )
}
