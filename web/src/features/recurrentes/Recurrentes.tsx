import { Button } from '@/components/ui/button'
import { Pause, Play, Plus } from 'lucide-react'
import { Monto } from '@/components/monto'
import { FraseTexto, Panel, Resumen } from '@/components/panel'
import { cn } from '@/lib/utils'
import { useMoneda } from '@/shell/hooks/useMoneda'
import { cargarResumenRecurrentes } from '../../lib/api'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { useVista } from '@/shell/hooks/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import { TabContent, type TabProps } from '@/shell/layout/TabContent'
import { useMutations } from '@/shell/hooks/useMutations'
import type { Recurrente } from '../../types'
import { openRecurrenteForm, openRecurrenteFormById } from './forms'

function RecCard({ r }: { r: Recurrente }) {
  const { cop } = useMoneda()
  const ctx = useOpenerCtx()
  const { apiActionOrBanner } = useMutations()
  const nextStr = r.proximo_pago?.texto ?? null
  const toggle = () => apiActionOrBanner(`/api/rec/${r.id}/pausar`)
  const Icono = r.activo ? Pause : Play
  return (
    <li data-rec={r.id} data-inactive={r.activo ? undefined : ''} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5', !r.activo && 'opacity-50')}>
      <div className="min-w-0 flex-1 basis-40">
        <div data-rec-name className="truncate text-sm font-medium">
          {r.nombre}
        </div>
        <div className="text-xs text-muted-foreground">
          {r.frecuencia_label} · {cop(r.monto)}
          {nextStr && (
            <>
              {' · '}
              <span data-rec-next className="font-medium text-foreground">
                {nextStr}
              </span>
            </>
          )}
        </div>
        {r.notas && <div className="truncate text-xs text-muted-foreground">{r.notas}</div>}
      </div>
      <div className="text-right leading-tight">
        <div data-rec-amount className={cn('text-sm font-semibold', r.tipo === 'ingreso' && 'text-cartera')}>
          {cop(r.mensual)}
        </div>
        <div className="text-[11px] text-muted-foreground">por mes</div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => void toggle()}
          title={r.activo ? 'Pausar' : 'Activar'}
          aria-label={`${r.activo ? 'Pausar' : 'Activar'}: ${r.nombre}`}
          className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icono className="size-4" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={() => openRecurrenteFormById(ctx, r.id)}
          className="h-8 cursor-pointer rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Editar
        </button>
      </div>
    </li>
  )
}

function Lista({ id, titulo, frase, items, emptyMsg, loaded }: { id: string; titulo: string; frase?: string; items: Recurrente[]; emptyMsg: string; loaded: boolean }) {
  return (
    <Panel id={id} titulo={titulo} frase={frase}>
      {!loaded ? null : !items.length ? (
        <p className="py-2 text-sm text-muted-foreground">{emptyMsg}</p>
      ) : (
        <ul className="divide-y">
          {items.map((r) => (
            <RecCard key={r.id} r={r} />
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function Recurrentes({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { data } = useVista('rec', cargarResumenRecurrentes, DEPENDENCIAS_DE_VISTA.resumenRecurrentes)
  const loaded = data !== null
  const neto = data?.neto_mensual ?? 0
  return (
    <TabContent id="recurrentes" active={active}>
      <div className="space-y-4">
        <Resumen
          id="rec-total"
          titulo="Neto mensual"
          loaded={loaded}
          valor={<Monto valor={neto} color="negativo" />}
          color="bg-muted-foreground"
          segmentos={data?.segmentos ?? []}
          dato={data && <span className="text-muted-foreground"><FraseTexto frase={data.dato} /></span>}
          extra={
            <Button size="sm" className="add-btn hidden md:inline-flex" onClick={() => openRecurrenteForm(ctx)}>
              <Plus aria-hidden="true" />
              Nuevo
            </Button>
          }
        />
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Lista id="rec-ingresos" titulo="Ingresos recurrentes" items={data?.ingresos ?? []} emptyMsg="Sin ingresos recurrentes." loaded={loaded} />
          <Lista id="rec-gastos" titulo="Gastos fijos" items={data?.gastos ?? []} emptyMsg="Sin gastos recurrentes." loaded={loaded} />
        </div>
      </div>
    </TabContent>
  )
}
