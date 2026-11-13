import type { ReactNode } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

export function Panel({
  id,
  titulo,
  frase,
  extra,
  className,
  children,
}: {
  id: string
  titulo: string
  frase?: ReactNode
  extra?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={cn('rounded-xl border bg-card p-4 text-card-foreground sm:p-5', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id={`${id}-titulo`} className="text-sm font-semibold text-muted-foreground">
          {titulo}
        </h2>
        {extra}
      </div>
      {frase && <p className="mb-4 text-[15px] leading-snug text-foreground">{frase}</p>}
      {children}
    </section>
  )
}

export function Periodos<T extends string>({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (p: T) => void
}) {
  return (
    <ToggleGroup
      id={id}
      type="single"
      size="sm"
      aria-label={label}
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as T)
      }}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} data-period={o.value}>
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function Barra({ valor, max, className }: { valor: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.max((Math.abs(valor) / max) * 100, valor ? 2 : 0) : 0
  return (
    <span aria-hidden="true" className="block h-2 w-full overflow-hidden rounded-full bg-muted">
      <span className={cn('block h-full rounded-full', className)} style={{ width: `${pct}%` }} />
    </span>
  )
}

export function Total({ label, valor, className }: { label: ReactNode; valor: ReactNode; className?: string }) {
  return (
    <div className={cn('mt-3 flex items-baseline justify-between border-t-2 border-foreground/80 pt-2 text-[15px] font-semibold', className)}>
      <span>{label}</span>
      <span>{valor}</span>
    </div>
  )
}
