import type { ChangeEvent, CSSProperties } from 'react'
import { fmtMoneyInput } from '../lib/format'

interface Props {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  prefix?: string
  style?: CSSProperties
  ariaLabel?: string
}

export function MoneyInput({ value, onChange, id, placeholder = '0', prefix = '$', style, ariaLabel }: Props) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    fmtMoneyInput(e.currentTarget)
    onChange(e.currentTarget.value)
  }
  return (
    <div className="money-wrap" style={style}>
      <span className="money-pfx">{prefix}</span>
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
