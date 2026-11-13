import { useId, useState, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { copShort } from '@/lib/format'
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
    <section id={id} aria-labelledby={`${id}-titulo`} className={cn('rounded-2xl border bg-card p-5 text-card-foreground sm:p-6', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
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

export interface Segmento {
  key: string
  label: string
  valor: number
}

export function topSegmentos(items: Segmento[], n = 4): Segmento[] {
  const orden = items.filter((s) => s.valor > 0).sort((a, b) => b.valor - a.valor)
  if (orden.length <= n + 1) return orden
  const otros = orden.slice(n).reduce((s, x) => s + x.valor, 0)
  return [...orden.slice(0, n), { key: '__otros', label: 'Otros', valor: otros }]
}

const TONOS = [1, 0.65, 0.45, 0.3, 0.2]

export function Resumen({
  id,
  titulo,
  valor,
  valorClassName,
  dato,
  segmentos,
  color,
  extra,
  loaded,
}: {
  id: string
  titulo: string
  valor: ReactNode
  valorClassName?: string
  dato?: ReactNode
  segmentos: Segmento[]
  color: string
  extra?: ReactNode
  loaded: boolean
}) {
  const segs = topSegmentos(segmentos)
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="rounded-2xl border bg-card p-5 text-card-foreground sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={`${id}-titulo`} className="text-sm font-medium text-muted-foreground">
            {titulo}
          </h2>
          {loaded ? (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={cn('text-3xl font-semibold tracking-tight sm:text-4xl', valorClassName)}>{valor}</span>
              {dato && <span className="text-sm font-medium">{dato}</span>}
            </div>
          ) : (
            <div className="skeleton mt-2 h-9 w-48 animate-pulse rounded-md bg-muted" />
          )}
        </div>
        {extra}
      </div>
      {loaded && segs.length > 0 && (
        <>
          <div aria-hidden="true" className="mt-5 flex h-3 gap-1 overflow-hidden rounded-full">
            {segs.map((s, i) => (
              <span key={s.key} className={color} style={{ flexGrow: s.valor, flexBasis: 0, minWidth: 4, opacity: TONOS[i] }} />
            ))}
          </div>
          <ul aria-label="De qué está hecho" className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {segs.map((s, i) => (
              <li key={s.key} className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', color)} style={{ opacity: TONOS[i] }} />
                <span className="max-w-[14rem] truncate">{s.label}</span>
                <span className="text-muted-foreground">{copShort(s.valor)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export function Desactualizado() {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className="stale-warning relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-describedby={id}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="grid size-6 cursor-pointer place-items-center rounded-md text-alerta-text transition-colors hover:bg-alerta/10"
      >
        <TriangleAlert className="size-4" aria-hidden="true" />
        <span className="sr-only">Aviso</span>
      </button>
      <span
        id={id}
        role="tooltip"
        className={cn(open ? 'absolute top-full right-0 z-20 mt-1 w-max max-w-64 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg' : 'sr-only')}
      >
        Valor sin actualizar hace más de 1 mes
      </span>
    </span>
  )
}
