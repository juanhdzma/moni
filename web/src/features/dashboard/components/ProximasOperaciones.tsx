import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { cargarProximasOperaciones } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useModal } from '@/shell/providers/ModalProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { useVista } from '@/shell/hooks/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import { openDeudaPayFormById } from '@/features/deudas'
import { openInvYieldFormById } from '@/features/inversiones'
import { openRecurrenteMaterializeFormById } from '@/features/recurrentes'
import { Skeleton } from '@/components/Skeleton'
import { Monto } from '@/components/monto'
import { FraseTexto, Panel } from '@/components/panel'

export function ProximasOperaciones() {
  const { apiActionOrBanner } = useMutations()
  const { setPendingProxOp } = useModal()
  const ctx = useOpenerCtx()
  const [todas, setTodas] = useState(false)
  const { data } = useVista('proximas', cargarProximasOperaciones, DEPENDENCIAS_DE_VISTA.proximasOperaciones)
  const loaded = data !== null
  const events = data ? (todas ? [...data.items, ...data.extra] : data.items) : []

  const materialize = (clave: string) => {
    const op = events.find((e) => e.clave === clave)
    if (!op) return
    setPendingProxOp(clave)
    if (op.tipo === 'deuda') openDeudaPayFormById(ctx, op.fuente_id)
    else if (op.tipo === 'inversion') openInvYieldFormById(ctx, op.fuente_id)
    else openRecurrenteMaterializeFormById(ctx, op.fuente_id, op.fecha)
  }

  const skip = (clave: string) => apiActionOrBanner('/api/ops-ocultas', { clave })

  return (
    <Panel id="dash-proximas" titulo="Lo que viene" frase={data?.frase ? <FraseTexto frase={data.frase} /> : undefined}>
      {!loaded ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : !events.length ? (
        <p className="py-3 text-sm text-muted-foreground">{data?.texto_vacio}</p>
      ) : (
        <>
          <ul id="dash-upcoming" className="divide-y">
            {events.map((e) => {
              const vencida = e.vencida
              return (
                <li key={e.clave} data-op={e.clave} className="prox-op-row flex items-center gap-3 py-2">
                  <div className="w-10 shrink-0 text-center leading-none" aria-hidden="true">
                    <div className={cn('text-xl font-semibold', vencida ? 'text-deudas' : 'text-foreground')}>{e.dia}</div>
                    <div className="mt-0.5 text-label font-medium tracking-wide text-muted-foreground uppercase">
                      {e.mes_corto}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="prox-op-label truncate text-sm">{e.etiqueta}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.sub} · <span className={cn(vencida && 'font-medium text-deudas')}>{e.texto_dias}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm font-semibold">
                    <Monto valor={e.monto} signo={e.sin_monto ? 'ninguno' : 'siempre'} color={e.sin_monto ? 'ninguno' : 'siempre'} />
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => void skip(e.clave)}
                      title="No tomar esta vez"
                      aria-label={`No tomar esta vez: ${e.etiqueta}`}
                      className="grid size-11 cursor-pointer place-items-center rounded-md text-muted-foreground sm:size-8 transition-colors hover:bg-muted hover:text-deudas"
                    >
                      <X className="size-4" strokeWidth={2.25} />
                    </button>
                    <button
                      type="button"
                      onClick={() => materialize(e.clave)}
                      title="Registrar"
                      aria-label={`Registrar: ${e.etiqueta}`}
                      className="grid size-11 cursor-pointer place-items-center rounded-md bg-primary sm:size-8 text-primary-foreground transition-opacity hover:opacity-85"
                    >
                      <Check className="size-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {data?.texto_ver_todas && (
            <button
              type="button"
              onClick={() => setTodas((v) => !v)}
              aria-expanded={todas}
              className="mt-2 cursor-pointer py-3 text-sm font-medium sm:py-0 text-muted-foreground hover:text-foreground"
            >
              {todas ? data.texto_ver_menos : data.texto_ver_todas}
            </button>
          )}
        </>
      )}
    </Panel>
  )
}
