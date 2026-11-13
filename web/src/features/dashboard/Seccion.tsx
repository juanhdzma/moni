import type { ReactNode } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

export function Seccion({
  titulo,
  extra,
  className,
  children,
  id,
}: {
  titulo: string
  extra?: ReactNode
  className?: string
  children: ReactNode
  id?: string
}) {
  const headingId = id ? `${id}-titulo` : undefined
  return (
    <section id={id} aria-labelledby={headingId} className={cn('border-t border-ink pt-4', className)}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id={headingId} className="text-lg font-semibold tracking-tight text-ink">
          {titulo}
        </h2>
        {extra}
      </div>
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
      className="-mx-2.5"
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} data-period={o.value} className="text-[13px]">
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function Leyenda({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-[13px] text-ink-2">{children}</p>
}
