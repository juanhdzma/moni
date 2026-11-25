import { Monto } from '@/components/monto'
import { useMoneda } from '@/shell/hooks/useMoneda'
import { Skeleton } from '@/components/Skeleton'
import { claseDeTono } from '@/components/tono'
import { cn } from '@/lib/utils'
import type { ResumenDashboard } from '@/types'

const ESQUELETO = [0, 1, 2, 3]

export function Patrimonio({ r, loading }: { r: ResumenDashboard | null; loading: boolean }) {
  const { cop, copShort } = useMoneda()
  const partes = r?.partes ?? []
  const totalBarra = r?.total_barra ?? 0
  const proy = r?.proy_delta ?? 0

  return (
    <section id="dash-patrimonio" aria-labelledby="patrimonio-titulo" className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="patrimonio-titulo" className="text-sm font-semibold text-muted-foreground">
          Patrimonio
        </h2>
        {loading || !r ? (
          <Skeleton className="h-9 w-40" aria-label="Cargando" />
        ) : (
          <span id="stat-networth" title={cop(r.patrimonio)} className="text-3xl font-semibold tracking-tight sm:text-4xl">
            <Monto valor={r.patrimonio} formato={copShort} signo="negativo" color="negativo" />
          </span>
        )}
        {!loading && (
          <span className="text-sm text-muted-foreground">
            <Monto valor={proy} formato={copShort} className="font-semibold" />{' '}
            {r?.texto_proyeccion}
          </span>
        )}
      </div>

      <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {!loading &&
          totalBarra > 0 &&
          partes.map((p) => <span key={p.id} className={claseDeTono(p.tono).fondo} style={{ flexGrow: Math.abs(p.valor), flexBasis: 0, minWidth: p.valor ? 3 : 0 }} />)}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4" aria-label="De qué está hecho">
        {!r &&
          ESQUELETO.map((i) => (
            <li key={i} aria-hidden="true">
              <Skeleton className="h-14" />
            </li>
          ))}
        {partes.map((p) => (
          <li key={p.id} id={`stat-${p.id}`} className="min-w-0">
            <div className="flex items-center gap-1.5 text-small text-muted-foreground">
              <span aria-hidden="true" className={cn('size-2 rounded-[2px]', claseDeTono(p.tono).fondo)} />
              {p.nombre}
            </div>
            <div className="mt-0.5 text-lg font-semibold">
              {loading ? '—' : <Monto valor={p.valor_firmado} tono={p.tono} formato={copShort} signo="negativo" />}
            </div>
            <div className="truncate text-xs text-muted-foreground">{p.detalle}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}
