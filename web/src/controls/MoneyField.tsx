import { Campo, idDeHint } from './Campo'
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
    <Campo id={id} label={label} hint={hint} hintId={hintId}>
      <MoneyInput id={id} value={value} onChange={onChange} placeholder={placeholder} describedBy={hint ? idDeHint(id, hintId) : undefined} />
    </Campo>
  )
}
