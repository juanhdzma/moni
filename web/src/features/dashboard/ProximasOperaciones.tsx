import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { cop } from '@/lib/format'
import { calcularProximasOperaciones, diasHasta, podarOcultas, skipOp, textoDias, visibles, type ProxOp } from '@/lib/proximasOps'
import { cn } from '@/lib/utils'
import { useModal } from '@/shell/ModalProvider'
import { useData } from '@/shell/DataProvider'
import { useOpenerCtx } from '@/shell/openers'
import { openDeudaPayFormById } from '../deudas'
import { openInvYieldFormById } from '../inversiones'
import { openRecurrenteMaterializeFormById } from '../recurrentes'
import { Seccion } from './Seccion'

const VISIBLES = 5
const MAX = 20

function tinta(e: ProxOp): string {
  if (e.type === 'deuda') return 'text-deudas'
  if (e.type === 'inversion') return 'text-inversiones'
  return e.monto >= 0 ? 'text-cartera' : 'text-ink'
}

export function ProximasOperaciones() {
  const { estado, refresh, loaded, loadOk } = useData()
  const { setPendingProxOp } = useModal()
  const ctx = useOpenerCtx()
  const [todas, setTodas] = useState(false)
  const events = loaded ? visibles(calcularProximasOperaciones(estado)) : []

  useEffect(() => {
    if (loadOk) podarOcultas(calcularProximasOperaciones(estado))
  }, [loadOk, estado])

  const materialize = (key: string) => {
    const op = events.find((e) => e.key === key)
    if (!op) return
    setPendingProxOp(key)
    if (op.type === 'deuda') openDeudaPayFormById(ctx, op.sourceId)
    else if (op.type === 'inversion') openInvYieldFormById(ctx, op.sourceId)
    else openRecurrenteMaterializeFormById(ctx, op.sourceId, op.dateISO)
  }

  const skip = (key: string) => {
    skipOp(key)
    refresh()
  }

  const capped = events.slice(0, MAX)
  const shown = todas ? capped : capped.slice(0, VISIBLES)

  return (
    <Seccion id="dash-proximas" titulo="Lo que viene">
      {!loaded ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-sm bg-wash" />
          ))}
        </div>
      ) : !events.length ? (
        <p className="py-4 text-[15px] text-ink-2">Sin operaciones en los próximos 45 días.</p>
      ) : (
        <>
          <ul id="dash-upcoming" className="divide-y divide-rule">
            {shown.map((e) => {
              const days = diasHasta(e.date)
              const vencida = days < 0
              return (
                <li key={e.key} data-op={e.key} className="prox-op-row flex items-center gap-4 py-3">
                  <div className="w-11 shrink-0 text-center leading-none" aria-hidden="true">
                    <div className={cn('text-[26px] font-medium tracking-tight', vencida ? 'text-deudas' : 'text-ink')}>{e.date.getDate()}</div>
                    <div className="mt-1 text-[11px] font-medium tracking-wide text-ink-2 uppercase">
                      {e.date.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="prox-op-label truncate text-[15px] text-ink">{e.label}</div>
                    <div className="text-[13px] text-ink-2">
                      {e.sub} · <span className={cn(vencida && 'font-medium text-deudas')}>{textoDias(days)}</span>
                    </div>
                  </div>
                  <div className={cn('shrink-0 text-right text-[15px] font-semibold', tinta(e))}>
                    {e.monto > 0 ? '+' : e.monto < 0 ? '−' : ''}
                    {cop(Math.abs(e.monto))}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => skip(e.key)}
                      title="No tomar esta vez"
                      aria-label={`No tomar esta vez: ${e.label}`}
                      className="grid size-9 cursor-pointer place-items-center rounded-sm text-ink-2 transition-colors hover:bg-wash hover:text-deudas"
                    >
                      <X className="size-4" strokeWidth={2.25} />
                    </button>
                    <button
                      type="button"
                      onClick={() => materialize(e.key)}
                      title="Registrar"
                      aria-label={`Registrar: ${e.label}`}
                      className="grid size-9 cursor-pointer place-items-center rounded-sm bg-ink text-paper transition-opacity hover:opacity-85"
                    >
                      <Check className="size-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {capped.length > VISIBLES && (
            <button
              type="button"
              onClick={() => setTodas((v) => !v)}
              aria-expanded={todas}
              className="mt-2 cursor-pointer text-[14px] font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
            >
              {todas ? 'Ver menos' : `Ver las ${capped.length}`}
            </button>
          )}
        </>
      )}
    </Seccion>
  )
}
