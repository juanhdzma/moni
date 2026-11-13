import { FilaFiguras } from '@/components/isotipo/FilaFiguras'
import type { ResumenDashboard } from '@/lib/dinero'
import { copShort, pct } from '@/lib/format'
import { escalaUnidad, fmtUnidad } from '@/lib/isotipo'
import { Seccion } from './Seccion'

export function EsteMes({ r, loading }: { r: ResumenDashboard; loading: boolean }) {
  const unidad = escalaUnidad([r.ingresos, r.gastos])
  const filas = [
    { id: 'entro', nombre: 'Entró', valor: r.ingresos, tinta: 'text-cartera', picto: 'billete' as const },
    { id: 'salio', nombre: 'Salió', valor: r.gastos, tinta: 'text-ink', picto: 'billete' as const },
  ]
  const ahorro = r.ahorroPct
  return (
    <Seccion id="dash-mes" titulo="Este mes en tu cartera">
      <div className="space-y-4">
        {filas.map((f) => (
          <div key={f.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] text-ink">{f.nombre}</span>
              <span className={`text-[15px] font-semibold ${f.tinta}`}>{loading ? '—' : copShort(f.valor)}</span>
            </div>
            {loading ? (
              <div className="h-5 w-1/2 animate-pulse rounded-sm bg-wash" />
            ) : (
              <FilaFiguras valor={f.valor} unidad={unidad} picto={f.picto} className={f.tinta} />
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 text-[15px] text-ink-2" id="stat-ahorro">
        {loading ? ' ' : r.ingresos <= 0 ? (
          'Todavía no entró plata este mes.'
        ) : ahorro >= 0 ? (
          <>
            Te quedó el <span className="font-semibold text-ink">{pct(ahorro)}%</span> de lo que entró.
          </>
        ) : (
          <>
            Salió <span className="font-semibold text-deudas">{pct(-ahorro)}%</span> más de lo que entró.
          </>
        )}
      </p>
      {!loading && <p className="mt-1 text-[13px] text-ink-2">Una figura = {fmtUnidad(unidad)}. Lo pagado con tarjeta no sale de la cartera.</p>}
    </Seccion>
  )
}
