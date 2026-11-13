import { transaccionesRecientes } from '@/lib/dinero'
import { cop, fmtDateShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Transaccion } from '@/types'
import { Panel } from '@/components/panel'

const N = 5

const tinta = (t: Transaccion) => (t.tipo === 'ingreso' ? 'text-cartera' : t.tipo === 'gasto' ? 'text-foreground' : 'text-muted-foreground')

export function Movimientos({ transacciones, loading }: { transacciones: Transaccion[]; loading: boolean }) {
  const recent = transaccionesRecientes(transacciones, N)
  return (
    <Panel id="dash-movimientos" titulo="Últimos movimientos">
      {loading ? null : recent.length ? (
        <ul id="recent-list" className="divide-y">
          {recent.map((t, i) => (
            <li key={`${t._id}-${i}`} className="recent-item flex items-baseline gap-3 py-2 text-sm">
              <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-xs text-muted-foreground">{fmtDateShort(t.fecha)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{t.descripcion || t.categoria}</span>
                <span className="block truncate text-xs text-muted-foreground">{t.categoria}</span>
              </span>
              <span className={cn('recent-amount shrink-0 font-semibold', tinta(t))} data-tipo={t.tipo}>
                {t.tipo === 'ingreso' ? '+' : '−'}
                {cop(t.monto)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-3 text-sm text-muted-foreground">Sin transacciones</p>
      )}
    </Panel>
  )
}
