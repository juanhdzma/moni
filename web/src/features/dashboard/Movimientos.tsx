import { transaccionesRecientes } from '@/lib/dinero'
import { cop, fmtDateShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Transaccion } from '@/types'
import { Seccion } from './Seccion'

const N = 10

const tinta = (t: Transaccion) => (t.tipo === 'ingreso' ? 'text-cartera' : t.tipo === 'gasto' ? 'text-ink' : 'text-ink-2')

export function Movimientos({ transacciones, loading }: { transacciones: Transaccion[]; loading: boolean }) {
  const recent = transaccionesRecientes(transacciones, N)
  return (
    <Seccion id="dash-movimientos" titulo="Últimos movimientos">
      {loading ? null : recent.length ? (
        <ul id="recent-list" className="divide-y divide-rule">
          {recent.map((t, i) => (
            <li key={`${t._id}-${i}`} className="recent-item flex items-baseline gap-4 py-2.5">
              <span className="w-[4.5rem] shrink-0 text-[13px] whitespace-nowrap text-ink-2">{fmtDateShort(t.fecha)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-ink">{t.descripcion || t.categoria}</span>
                <span className="block truncate text-[13px] text-ink-2">{t.categoria}</span>
              </span>
              <span className={cn('recent-amount shrink-0 text-[15px] font-semibold', tinta(t))} data-tipo={t.tipo}>
                {t.tipo === 'ingreso' ? '+' : '−'}
                {cop(t.monto)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-4 text-[15px] text-ink-2">Sin transacciones</p>
      )}
    </Seccion>
  )
}
