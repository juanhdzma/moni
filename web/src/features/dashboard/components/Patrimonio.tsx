import { Monto } from '@/components/Monto'
import { CLASE_TARJETA } from '@/components/Panel'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { Skeleton } from '@/components/Skeleton'
import { claseDeTono } from '@/components/tono'
import { cn } from '@/lib/utils'
import type { ResumenDashboard } from '@/types'

const ESQUELETO = [0, 1, 2, 3]

export function Patrimonio({ r, loading, error }: { r: ResumenDashboard | null; loading: boolean; error: string | null }) {
  const { cop, copShort } = useMoneda()
  const partes = r?.partes ?? []

  return (
    <section id="dash-patrimonio" aria-labelledby="patrimonio-titulo" className={CLASE_TARJETA}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="patrimonio-titulo" className="text-sm font-semibold text-muted-foreground">
          Patrimonio
        </h2>
        {error ? (
          <span role="alert" className="text-sm text-deudas">
            {error}
          </span>
        ) : loading || !r ? (
          <Skeleton className="h-9 w-40" role="status" aria-label="Cargando" />
        ) : (
          <span id="stat-networth" title={cop(r.patrimonio)} className="text-3xl font-semibold tracking-tight sm:text-4xl">
            <Monto valor={r.patrimonio} tono={r.patrimonio_tono} signo={r.patrimonio_signo} formato={copShort} mostrarSigno="negativo" color="negativo" />
          </span>
        )}
        {!loading && r && (
          <span className="text-sm text-muted-foreground">
            <Monto valor={r.proy_delta} tono={r.proy_delta_tono} signo={r.proy_delta_signo} formato={copShort} className="font-semibold" />{' '}
            {r.texto_proyeccion}
          </span>
        )}
      </div>

      <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {!loading &&
          partes.map((p) => <span key={p.id} className={claseDeTono(p.tono).fondo} style={{ flexGrow: p.proporcion, flexBasis: 0, minWidth: p.proporcion ? 3 : 0 }} />)}
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
              {loading ? '—' : <Monto valor={p.valor_firmado} tono={p.tono} signo={p.valor_signo} formato={copShort} mostrarSigno="negativo" />}
            </div>
            <div className="truncate text-xs text-muted-foreground">{p.detalle}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}
