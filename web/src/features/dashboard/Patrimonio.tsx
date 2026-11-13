import type { ResumenDashboard } from '@/lib/dinero'
import { cop, copShort, pct, signStr } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Estado } from '@/types'

const plural = (n: number, s: string, p: string) => `${n} ${n !== 1 ? p : s}`

interface Parte {
  id: string
  nombre: string
  valor: number
  negativo: boolean
  fondo: string
  texto: string
  detalle: string
}

export function Patrimonio({ r, estado, loading }: { r: ResumenDashboard; estado: Estado; loading: boolean }) {
  const invDetalle =
    r.totalInvertido > 0
      ? `${r.gananciaInv >= 0 ? '+' : ''}${copShort(r.gananciaInv)} (${signStr(r.ganPct)}${pct(Math.abs(r.ganPct))}%)`
      : plural(estado.inversiones.length, 'posición', 'posiciones')
  const carteraNeg = r.efectivo < 0
  const partes: Parte[] = [
    { id: 'activos', nombre: 'Activos', valor: r.totalActivos, negativo: false, fondo: 'bg-activos', texto: 'text-activos-text', detalle: plural(estado.activos.length, 'activo', 'activos') },
    { id: 'inversiones', nombre: 'Inversiones', valor: r.totalInv, negativo: false, fondo: 'bg-inversiones', texto: 'text-inversiones-text', detalle: invDetalle },
    { id: 'balance', nombre: 'Cartera', valor: r.efectivo, negativo: carteraNeg, fondo: carteraNeg ? 'bg-deudas' : 'bg-cartera', texto: carteraNeg ? 'text-deudas' : 'text-cartera', detalle: 'Efectivo y cuentas' },
    { id: 'deudas', nombre: 'Deudas', valor: r.totalDeuda, negativo: true, fondo: 'bg-deudas', texto: 'text-deudas', detalle: `${cop(r.cuotaTotal)}/mes · ${plural(r.deudasActivas.length, 'deuda', 'deudas')}` },
  ]
  const totalBarra = partes.reduce((s, p) => s + Math.abs(p.valor), 0)
  const proy = r.proyDelta

  return (
    <section id="dash-patrimonio" aria-labelledby="patrimonio-titulo" className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 id="patrimonio-titulo" className="text-sm font-semibold text-muted-foreground">
          Patrimonio
        </h1>
        {loading ? (
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
          partes.map((p) => <span key={p.id} className={p.fondo} style={{ flexGrow: Math.abs(p.valor), flexBasis: 0, minWidth: p.valor ? 3 : 0 }} />)}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4" aria-label="De qué está hecho">
        {partes.map((p) => (
          <li key={p.id} id={`stat-${p.id}`} className="min-w-0">
            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span aria-hidden="true" className={cn('size-2 rounded-[2px]', p.fondo)} />
              {p.nombre}
            </div>
            <div className={cn('mt-0.5 text-lg font-semibold', p.texto)}>
              {loading ? '—' : `${p.negativo ? '−' : ''}${copShort(Math.abs(p.valor))}`}
            </div>
            <div className="truncate text-xs text-muted-foreground">{loading ? '' : p.detalle}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}
