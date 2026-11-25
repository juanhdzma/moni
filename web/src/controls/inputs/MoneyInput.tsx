import type { ChangeEvent } from 'react'
import { fmtMoneyInput } from '@/lib/format'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'

interface Props {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  ariaLabel?: string
  describedBy?: string
}

export function MoneyInput({ value, onChange, id, placeholder = '0', ariaLabel, describedBy }: Props) {
  const { simbolo } = useMoneda()
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    fmtMoneyInput(e.currentTarget)
    onChange(e.currentTarget.value)
  }
  return (
    <div className="money-wrap">
      <span className="money-pfx">{simbolo}</span>
      <input
        className="form-input"
        type="text"
        inputMode="numeric"
        id={id}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        onChange={handle}
      />
    </div>
  )
}
