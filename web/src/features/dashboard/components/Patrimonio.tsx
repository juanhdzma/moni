import { cop, copShort, pct, signStr } from '@/lib/format'
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

function detalleTexto(p: ParteResumen): string {
  const d = p.detalle_datos
  if (d && 'ganancia' in d) return `${d.ganancia >= 0 ? '+' : ''}${copShort(d.ganancia)} (${signStr(d.ganancia_pct)}${pct(Math.abs(d.ganancia_pct))}%)`
  if (d) return `${cop(d.cuota_total)}/mes · ${d.n}`
  return p.detalle ?? ''
}

const PARTES_VACIAS: ParteResumen[] = [
  { id: 'activos', nombre: 'Activos', valor: 0, negativo: false, detalle: null },
  { id: 'inversiones', nombre: 'Inversiones', valor: 0, negativo: false, detalle: null },
  { id: 'balance', nombre: 'Cartera', valor: 0, negativo: false, detalle: null },
  { id: 'deudas', nombre: 'Deudas', valor: 0, negativo: false, detalle: null },
]

export function Patrimonio({ r, loading }: { r: ResumenDashboard | null; loading: boolean }) {
  const partes = r?.partes ?? PARTES_VACIAS
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
          <span id="stat-networth" title={cop(r.patrimonio)} className={cn('text-3xl font-semibold tracking-tight sm:text-4xl', r.patrimonio < 0 && 'text-deudas')}>
            {copShort(r.patrimonio)}
          </span>
        )}
        {!loading && (
          <span className="text-sm text-muted-foreground">
            <span className={cn('font-semibold', proy >= 0 ? 'text-inversiones-text' : 'text-deudas')}>
              {signStr(proy)}
              {copShort(Math.abs(proy))}
            </span>{' '}
            proyectados en 12 meses
          </span>
        )}
      </div>

      <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {!loading &&
          totalBarra > 0 &&
          partes.map((p) => <span key={p.id} className={fondo(p)} style={{ flexGrow: Math.abs(p.valor), flexBasis: 0, minWidth: p.valor ? 3 : 0 }} />)}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4" aria-label="De qué está hecho">
        {partes.map((p) => (
          <li key={p.id} id={`stat-${p.id}`} className="min-w-0">
            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span aria-hidden="true" className={cn('size-2 rounded-[2px]', fondo(p))} />
              {p.nombre}
            </div>
            <div className={cn('mt-0.5 text-lg font-semibold', texto(p))}>
              {loading ? '—' : `${p.negativo ? '−' : ''}${copShort(Math.abs(p.valor))}`}
            </div>
            <div className="truncate text-xs text-muted-foreground">{loading ? '' : detalleTexto(p)}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}
