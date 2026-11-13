import { Bloque, FilaFiguras } from '@/components/isotipo/FilaFiguras'
import type { ResumenDashboard } from '@/lib/dinero'
import { cop, copShort, pct, signStr } from '@/lib/format'
import { escalaUnidad, fmtUnidad } from '@/lib/isotipo'
import type { Estado } from '@/types'

const plural = (n: number, s: string, p: string) => `${n} ${n !== 1 ? p : s}`

interface Parte {
  id: string
  nombre: string
  valor: number
  negativo: boolean
  tinta: string
  texto: string
  detalle: string
}

export function Patrimonio({ r, estado, loading }: { r: ResumenDashboard; estado: Estado; loading: boolean }) {
  const invDetalle =
    r.totalInvertido > 0
      ? `${r.gananciaInv >= 0 ? '+' : ''}${copShort(r.gananciaInv)} (${signStr(r.ganPct)}${pct(Math.abs(r.ganPct))}%) sobre lo invertido`
      : plural(estado.inversiones.length, 'posición', 'posiciones')

  const partes: Parte[] = [
    { id: 'activos', nombre: 'Activos', valor: r.totalActivos, negativo: false, tinta: 'text-activos', texto: 'text-activos-text', detalle: plural(estado.activos.length, 'activo', 'activos') },
    { id: 'inversiones', nombre: 'Inversiones', valor: r.totalInv, negativo: false, tinta: 'text-inversiones', texto: 'text-inversiones', detalle: invDetalle },
    {
      id: 'cartera',
      nombre: 'Cartera',
      valor: r.efectivo,
      negativo: r.efectivo < 0,
     
      tinta: r.efectivo < 0 ? 'text-deudas' : 'text-cartera',
      texto: r.efectivo < 0 ? 'text-deudas' : 'text-cartera',
      detalle: 'Efectivo y cuentas',
    },
    {
      id: 'deudas',
      nombre: 'Deudas',
      valor: r.totalDeuda,
      negativo: true,
     
      tinta: 'text-deudas',
      texto: 'text-deudas',
      detalle: `${cop(r.cuotaTotal)}/mes · ${plural(r.deudasActivas.length, 'deuda', 'deudas')}`,
    },
  ]
  const unidad = escalaUnidad(partes.map((p) => p.valor))
  const proy = `${signStr(r.proyDelta)}${copShort(Math.abs(r.proyDelta))}`

  return (
    <section aria-labelledby="patrimonio-titulo" id="dash-patrimonio">
      <h1 id="patrimonio-titulo" className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {loading ? (
          <span className="block h-[clamp(3rem,7vw,5.25rem)] w-64 animate-pulse rounded-sm bg-wash" aria-label="Cargando" />
        ) : (
          <span
            id="stat-networth"
            title={cop(r.patrimonio)}
            className={`text-[clamp(3rem,7vw,5.25rem)] leading-none font-medium tracking-[-0.035em] ${r.patrimonio < 0 ? 'text-deudas' : 'text-ink'}`}
          >
            {copShort(r.patrimonio)}
          </span>
        )}
        <span className="text-xl font-normal text-ink-2">de patrimonio</span>
      </h1>
      <p className="mt-3 text-[15px] text-ink-2">
        {loading ? ' ' : (
          <>
            <span className="font-medium text-ink">{proy}</span> proyectados en los próximos 12 meses, al ritmo de los últimos 12.
          </>
        )}
      </p>

      <ul className="mt-8 space-y-4" aria-label="De qué está hecho">
        {partes.map((p) => (
          <li key={p.id} id={`stat-${p.id === 'cartera' ? 'balance' : p.id}`} className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[11rem_1fr] sm:items-center">
            <div className="flex items-baseline justify-between gap-3 sm:block">
              <div className="text-[15px] text-ink">
                {p.negativo && <span className="sr-only">Resta: </span>}
                {p.nombre}
              </div>
              <div className={`text-[15px] font-semibold ${p.texto}`}>
                {loading ? '—' : `${p.negativo ? '−' : ''}${copShort(Math.abs(p.valor))}`}
              </div>
              <div className="hidden text-[13px] leading-snug text-ink-2 sm:block">{loading ? '' : p.detalle}</div>
            </div>
            {loading ? (
              <div className="h-5 w-1/2 animate-pulse rounded-sm bg-wash" />
            ) : (
              <FilaFiguras valor={p.valor} unidad={unidad} className={p.tinta} />
            )}
            <div className="text-[13px] text-ink-2 sm:hidden">{loading ? '' : p.detalle}</div>
          </li>
        ))}
      </ul>
      {!loading && (
        <p className="mt-5 flex items-center gap-2 text-[13px] text-ink-2">
          <Bloque className="size-3 text-ink" />
          Una figura = {fmtUnidad(unidad)}. Lo rojo resta.
        </p>
      )}
    </section>
  )
}
