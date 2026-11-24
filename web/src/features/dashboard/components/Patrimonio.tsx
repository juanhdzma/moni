import { Monto } from '@/components/monto'
import { useMoneda } from '@/shell/hooks/useMoneda'
import { cn } from '@/lib/utils'
import type { ParteResumen, ResumenDashboard } from '@/types'

const ESTILO: Record<ParteResumen['id'], { fondo: string; texto: string }> = {
  activos: { fondo: 'bg-activos', texto: 'text-activos-text' },
  inversiones: { fondo: 'bg-inversiones', texto: 'text-inversiones-text' },
  balance: { fondo: 'bg-cartera', texto: 'text-cartera' },
  deudas: { fondo: 'bg-deudas', texto: 'text-deudas' },
}

const fondo = (p: ParteResumen) => (p.id === 'balance' && p.negativo ? 'bg-deudas' : ESTILO[p.id].fondo)
const texto = (p: ParteResumen) => (p.id === 'balance' && p.negativo ? 'text-deudas' : ESTILO[p.id].texto)

const ESQUELETO = [0, 1, 2, 3]

export function Patrimonio({ r, loading }: { r: ResumenDashboard | null; loading: boolean }) {
  const { cop, copShort } = useMoneda()
  const partes = r?.partes ?? []
  const totalBarra = r?.total_barra ?? 0
  const proy = r?.proy_delta ?? 0

  return (
    <section id="dash-patrimonio" aria-labelledby="patrimonio-titulo" className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 id="patrimonio-titulo" className="text-sm font-semibold text-muted-foreground">
          Patrimonio
        </h1>
        {loading || !r ? (
          <span className="h-9 w-40 animate-pulse rounded-md bg-muted" aria-label="Cargando" />
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
          partes.map((p) => <span key={p.id} className={fondo(p)} style={{ flexGrow: Math.abs(p.valor), flexBasis: 0, minWidth: p.valor ? 3 : 0 }} />)}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4" aria-label="De qué está hecho">
        {!r &&
          ESQUELETO.map((i) => (
            <li key={i} className="h-14 animate-pulse rounded-md bg-muted" aria-hidden="true" />
          ))}
        {partes.map((p) => (
          <li key={p.id} id={`stat-${p.id}`} className="min-w-0">
            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span aria-hidden="true" className={cn('size-2 rounded-[2px]', fondo(p))} />
              {p.nombre}
            </div>
            <div className={cn('mt-0.5 text-lg font-semibold', texto(p))}>
              {loading ? '—' : <Monto valor={p.valor_firmado} formato={copShort} signo="negativo" color="ninguno" />}
            </div>
            <div className="truncate text-xs text-muted-foreground">{p.detalle}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}
