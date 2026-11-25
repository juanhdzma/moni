import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { OpcionConTono } from '@/types'
import { Hint } from './Hint'

interface Props<T extends string> {
  label?: string
  value: T
  opciones: OpcionConTono[]
  onChange: (value: T) => void
  idPrefix?: string
  ids?: Record<string, string>
  hint?: ReactNode
  hintId?: string
  inline?: boolean
}

export function TipoToggle<T extends string>({ label = 'Tipo', value, opciones, onChange, idPrefix, ids, hint, hintId, inline = false }: Props<T>) {
  const labelId = useId()
  const grupo = (
    <div className={cn('tipo-toggle', inline && 'shrink-0')} role="group" aria-labelledby={inline ? undefined : labelId} aria-label={inline ? label : undefined}>
      {opciones.map((o) => (
        <button
          key={o.value}
          type="button"
          id={ids?.[o.value] ?? (idPrefix ? `${idPrefix}-${o.value}` : undefined)}
          className={cn('tipo-btn', o.tono ?? o.value, o.value === value && 'sel')}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value as T)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
  if (inline) return grupo
  return (
    <div className="form-group">
      <div className="form-label" id={labelId}>
        {label}
      </div>
      {grupo}
      {hint && <Hint id={hintId}>{hint}</Hint>}
    </div>
  )
}
