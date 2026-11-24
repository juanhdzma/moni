import type { ChangeEvent } from 'react'
import { fmtMoneyInput, getCurrencySymbol } from '../lib/format'

interface Props {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  ariaLabel?: string
}

export function MoneyInput({ value, onChange, id, placeholder = '0', ariaLabel }: Props) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    fmtMoneyInput(e.currentTarget)
    onChange(e.currentTarget.value)
  }
  return (
    <div className="money-wrap">
      <span className="money-pfx">{getCurrencySymbol()}</span>
      <input
        className="form-input"
        type="text"
        inputMode="numeric"
        id={id}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={handle}
      />
    </div>
  )
}
