import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { cargarProximasOperaciones, ocultarOp } from '@/lib/api'
import { cop, errMsg } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useModal } from '@/shell/providers/ModalProvider'
import { useData } from '@/shell/providers/DataProvider'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { useVista } from '@/shell/hooks/useVista'
import type { OperacionProxima } from '@/types'
import { openDeudaPayFormById } from '../../deudas'
import { openInvYieldFormById } from '../../inversiones'
import { openRecurrenteMaterializeFormById } from '../../recurrentes'
import { FraseTexto, Panel } from '@/components/panel'

function tinta(e: OperacionProxima): string {
  if (e.tipo === 'deuda') return 'text-deudas'
  if (e.tipo === 'inversion') return 'text-inversiones-text'
  return e.monto >= 0 ? 'text-cartera' : 'text-foreground'
}

export function ProximasOperaciones() {
  const { reload, showBanner } = useData()
  const { setPendingProxOp } = useModal()
  const ctx = useOpenerCtx()
  const [todas, setTodas] = useState(false)
  const { data } = useVista('proximas', cargarProximasOperaciones)
  const loaded = data !== null
  const events = data?.items ?? []

  const materialize = (clave: string) => {
    const op = events.find((e) => e.clave === clave)
    if (!op) return
    setPendingProxOp(clave)
    if (op.tipo === 'deuda') openDeudaPayFormById(ctx, op.fuente_id)
    else if (op.tipo === 'inversion') openInvYieldFormById(ctx, op.fuente_id)
    else openRecurrenteMaterializeFormById(ctx, op.fuente_id, op.fecha)
  }

  const skip = async (clave: string) => {
    try {
      await ocultarOp(clave)
    } catch (err) {
      await reload()
      showBanner(errMsg(err))
      return
    }
    await reload()
  }

  const visibles = data?.visibles ?? 0
  const shown = todas ? events : events.slice(0, visibles)

  return (
    <Panel id="dash-proximas" titulo="Lo que viene" frase={data?.frase ? <FraseTexto frase={data.frase} /> : undefined}>
      {!loaded ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : !events.length ? (
        <p className="py-3 text-sm text-muted-foreground">{data?.texto_vacio}</p>
      ) : (
        <>
          <ul id="dash-upcoming" className="divide-y">
            {shown.map((e) => {
              const vencida = e.vencida
              return (
                <li key={e.clave} data-op={e.clave} className="prox-op-row flex items-center gap-3 py-2">
                  <div className="w-10 shrink-0 text-center leading-none" aria-hidden="true">
                    <div className={cn('text-xl font-semibold', vencida ? 'text-deudas' : 'text-foreground')}>{e.dia}</div>
                    <div className="mt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {e.mes_corto}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="prox-op-label truncate text-sm">{e.etiqueta}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.sub} · <span className={cn(vencida && 'font-medium text-deudas')}>{e.texto_dias}</span>
                    </div>
                  </div>
                  <div className={cn('shrink-0 text-right text-sm font-semibold', tinta(e))}>
                    {e.monto > 0 ? '+' : e.monto < 0 ? '−' : ''}
                    {cop(Math.abs(e.monto))}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => void skip(e.clave)}
                      title="No tomar esta vez"
                      aria-label={`No tomar esta vez: ${e.etiqueta}`}
                      className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-deudas"
                    >
                      <X className="size-4" strokeWidth={2.25} />
                    </button>
                    <button
                      type="button"
                      onClick={() => materialize(e.clave)}
                      title="Registrar"
                      aria-label={`Registrar: ${e.etiqueta}`}
                      className="grid size-8 cursor-pointer place-items-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-85"
                    >
                      <Check className="size-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {events.length > visibles && (
            <button
              type="button"
              onClick={() => setTodas((v) => !v)}
              aria-expanded={todas}
              className="mt-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {todas ? 'Ver menos' : `Ver las ${events.length}`}
            </button>
          )}
        </>
      )}
    </Panel>
  )
}
