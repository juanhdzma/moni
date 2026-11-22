import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Opcion } from '@/types'

type Tono = 'ingreso' | 'gasto'

interface Props<T extends string> {
  label?: string
  value: T
  opciones: Opcion[]
  onChange: (value: T) => void
  tonos?: Record<string, Tono>
  idPrefix?: string
  ids?: Record<string, string>
  hint?: ReactNode
  hintId?: string
}

const esTono = (v: string): v is Tono => v === 'ingreso' || v === 'gasto'

export function TipoToggle<T extends string>({ label = 'Tipo', value, opciones, onChange, tonos, idPrefix, ids, hint, hintId }: Props<T>) {
  const labelId = useId()
  return (
    <div className="form-group">
      <div className="form-label" id={labelId}>
        {label}
      </div>
      <div className="tipo-toggle" role="group" aria-labelledby={labelId}>
        {opciones.map((o) => (
          <button
            key={o.value}
            type="button"
            id={ids?.[o.value] ?? (idPrefix ? `${idPrefix}-${o.value}` : undefined)}
            className={cn('tipo-btn', tonos?.[o.value] ?? (esTono(o.value) ? o.value : ''), o.value === value && 'sel')}
            onClick={() => onChange(o.value as T)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <div id={hintId} className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
