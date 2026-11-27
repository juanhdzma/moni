import { useId, useState, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { cn } from '@/lib/utils'
import type { Frase, Segmento } from '@/types'
import { Skeleton } from '@/components/Skeleton'
import { claseDeTono } from '@/components/tono'

export const CLASE_TARJETA = 'rounded-2xl border bg-card p-5 text-card-foreground sm:p-6'

export function FraseTexto({ frase }: { frase: Frase }) {
  return (
    <>
      {frase.partes.map((p, i) => (p.tono ? <span key={i} className={cn('font-semibold', p.tono !== 'fuerte' && claseDeTono(p.tono).texto)}>{p.texto}</span> : p.texto))}
    </>
  )
}

export function Panel({
  id,
  titulo,
  frase,
  extra,
  className,
  error,
  children,
}: {
  id: string
  titulo: string
  frase?: ReactNode
  extra?: ReactNode
  className?: string
  error?: string | null
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={cn(CLASE_TARJETA, className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id={`${id}-titulo`} className="text-sm font-semibold text-muted-foreground">
          {titulo}
        </h2>
        {extra}
      </div>
      {error ? (
        <p role="alert" className="py-4 text-sm text-deudas">
          {error}
        </p>
      ) : (
        <>
          {frase && <p className="mb-4 text-body leading-snug text-foreground">{frase}</p>}
          {children}
        </>
      )}
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
        <ToggleGroupItem key={o.value} value={o.value} data-period={o.value} className="max-sm:min-h-11">
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function Barra({ pct, className }: { pct: number; className?: string }) {
  return (
    <span aria-hidden="true" className="block h-2 w-full overflow-hidden rounded-full bg-muted">
      <span className={cn('block h-full rounded-full', className)} style={{ width: `${pct}%` }} />
    </span>
  )
}

export function Total({ label, valor, className }: { label: ReactNode; valor: ReactNode; className?: string }) {
  return (
    <div className={cn('mt-3 flex items-baseline justify-between border-t-2 border-foreground/80 pt-2 text-body font-semibold', className)}>
      <span>{label}</span>
      <span>{valor}</span>
    </div>
  )
}

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
  error,
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
  error?: string | null
}) {
  const { copShort } = useMoneda()
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={CLASE_TARJETA}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={`${id}-titulo`} className="text-sm font-medium text-muted-foreground">
            {titulo}
          </h2>
          {error ? (
            <p role="alert" className="mt-2 text-sm text-deudas">
              {error}
            </p>
          ) : loaded ? (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={cn('text-3xl font-semibold tracking-tight sm:text-4xl', valorClassName)}>{valor}</span>
              {dato && <span className="text-sm font-medium">{dato}</span>}
            </div>
          ) : (
            <Skeleton className="mt-2 h-9 w-48" />
          )}
        </div>
        {extra}
      </div>
      {loaded && segmentos.length > 0 && (
        <>
          <div aria-hidden="true" className="mt-5 flex h-3 gap-1 overflow-hidden rounded-full">
            {segmentos.map((s) => (
              <span key={s.key} className={color} style={{ flexGrow: s.valor, flexBasis: 0, minWidth: 4, opacity: s.opacidad }} />
            ))}
          </div>
          <ul aria-label="De qué está hecho" className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {segmentos.map((s) => (
              <li key={s.key} className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', color)} style={{ opacity: s.opacidad }} />
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

export function Desactualizado({ texto }: { texto: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className="stale-warning relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-describedby={id}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="relative grid size-6 cursor-pointer place-items-center rounded-md text-alerta-text transition-colors after:absolute after:-inset-2.5 hover:bg-alerta/10"
      >
        <TriangleAlert className="size-4" aria-hidden="true" />
        <span className="sr-only">Aviso</span>
      </button>
      <span
        id={id}
        role="tooltip"
        className={cn(open ? 'absolute top-full right-0 z-20 mt-1 w-max max-w-64 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg' : 'sr-only')}
      >
        {texto}
      </span>
    </span>
  )
}
