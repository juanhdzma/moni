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
import { Panel } from '@/components/panel'

const VISIBLES = 5
const MAX = 20

function tinta(e: ProxOp): string {
  if (e.type === 'deuda') return 'text-deudas'
  if (e.type === 'inversion') return 'text-inversiones-text'
  return e.monto >= 0 ? 'text-cartera' : 'text-foreground'
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
  const vencidas = events.filter((e) => diasHasta(e.date) < 0).length
  const salen = events.filter((e) => e.monto < 0).reduce((s, e) => s - e.monto, 0)
  const frase = !loaded || !events.length ? undefined : vencidas ? (
    <>
      Tenés <span className="font-semibold text-deudas">{vencidas} {vencidas === 1 ? 'pago vencido' : 'pagos vencidos'}</span> y{' '}
      <span className="font-semibold">{cop(salen)}</span> por pagar en 45 días.
    </>
  ) : (
    <>
      <span className="font-semibold">{cop(salen)}</span> por pagar en los próximos 45 días.
    </>
  )

  return (
    <Panel id="dash-proximas" titulo="Lo que viene" frase={frase}>
      {!loaded ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : !events.length ? (
        <p className="py-3 text-sm text-muted-foreground">Sin operaciones en los próximos 45 días.</p>
      ) : (
        <>
          <ul id="dash-upcoming" className="divide-y">
            {shown.map((e) => {
              const days = diasHasta(e.date)
              const vencida = days < 0
              return (
                <li key={e.key} data-op={e.key} className="prox-op-row flex items-center gap-3 py-2">
                  <div className="w-10 shrink-0 text-center leading-none" aria-hidden="true">
                    <div className={cn('text-xl font-semibold', vencida ? 'text-deudas' : 'text-foreground')}>{e.date.getDate()}</div>
                    <div className="mt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {e.date.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="prox-op-label truncate text-sm">{e.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.sub} · <span className={cn(vencida && 'font-medium text-deudas')}>{textoDias(days)}</span>
                    </div>
                  </div>
                  <div className={cn('shrink-0 text-right text-sm font-semibold', tinta(e))}>
                    {e.monto > 0 ? '+' : e.monto < 0 ? '−' : ''}
                    {cop(Math.abs(e.monto))}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => skip(e.key)}
                      title="No tomar esta vez"
                      aria-label={`No tomar esta vez: ${e.label}`}
                      className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-deudas"
                    >
                      <X className="size-4" strokeWidth={2.25} />
                    </button>
                    <button
                      type="button"
                      onClick={() => materialize(e.key)}
                      title="Registrar"
                      aria-label={`Registrar: ${e.label}`}
                      className="grid size-8 cursor-pointer place-items-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-85"
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
              className="mt-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {todas ? 'Ver menos' : `Ver las ${capped.length}`}
            </button>
          )}
        </>
      )}
    </Panel>
  )
}
