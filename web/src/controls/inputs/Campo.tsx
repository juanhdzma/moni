import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Hint } from '@/controls/forms/FormStatus'

interface CampoProps {
  id: string
  label: string
  hint?: ReactNode
  hintId?: string
  className?: string
  labelClassName?: string
  children: ReactNode
}

export const idDeHint = (id: string, hintId?: string) => hintId ?? `${id}-hint`

export function Campo({ id, label, hint, hintId, className, labelClassName, children }: CampoProps) {
  return (
    <div className={cn('form-group', className)}>
      <label className={cn('form-label', labelClassName)} htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && <Hint id={idDeHint(id, hintId)}>{hint}</Hint>}
    </div>
  )
}

interface NumeroFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  step?: string
  min?: number
  max?: number
  placeholder?: string
  hint?: ReactNode
  hintId?: string
  derecha?: ReactNode
  className?: string
}

export function NumeroField({ id, label, value, onChange, step, min, max, placeholder, hint, hintId, derecha, className }: NumeroFieldProps) {
  const input = (
    <input
      className={cn('form-input', derecha && 'flex-1')}
      type="number"
      id={id}
      step={step}
      min={min}
      max={max}
      value={value}
      placeholder={placeholder}
      aria-describedby={hint ? idDeHint(id, hintId) : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  )
  return (
    <Campo id={id} label={label} hint={hint} hintId={hintId} className={className}>
      {derecha ? (
        <div className="flex items-center gap-2">
          {input}
          {derecha}
        </div>
      ) : (
        input
      )}
    </Campo>
  )
}
