import { Button } from '@/components/ui/button'
import { Pause, Play, Plus } from 'lucide-react'
import { Panel, Resumen } from '@/components/panel'
import { cn } from '@/lib/utils'
import { cop, signStr } from '../../lib/format'
import { FRECUENCIAS, nextPaymentStr, toMensual } from '../../lib/recurrentes'
import { useData } from '../../shell/DataProvider'
import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import { useMutations } from '../../shell/useMutations'
import type { Recurrente } from '../../types'
import { openRecurrenteForm, openRecurrenteFormById } from './forms'

function RecCard({ r }: { r: Recurrente }) {
  const ctx = useOpenerCtx()
  const { crudOpOrBanner } = useMutations()
  const mensual = toMensual(r.monto, r.frecuencia)
  const frecLabel = Object.hasOwn(FRECUENCIAS, r.frecuencia) ? FRECUENCIAS[r.frecuencia].label : r.frecuencia
  const nextStr = r.activo ? nextPaymentStr(r.fecha_inicio, r.frecuencia) : null
  const toggle = () => {
    const { _id, ...rest } = r
    void crudOpOrBanner('rec', 'update', { ...rest, activo: !r.activo, _id })
  }
  const Icono = r.activo ? Pause : Play
  return (
    <li data-rec={r._id} data-inactive={r.activo ? undefined : ''} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5', !r.activo && 'opacity-50')}>
      <div className="min-w-0 flex-1 basis-40">
        <div data-rec-name className="truncate text-sm font-medium">
          {r.nombre}
        </div>
        <div className="text-xs text-muted-foreground">
          {frecLabel} · {cop(r.monto)}
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
          {cop(mensual)}
        </div>
        <div className="text-[11px] text-muted-foreground">por mes</div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={toggle}
          title={r.activo ? 'Pausar' : 'Activar'}
          aria-label={`${r.activo ? 'Pausar' : 'Activar'}: ${r.nombre}`}
          className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icono className="size-4" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={() => openRecurrenteFormById(ctx, r._id)}
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
          {[...items]
            .sort((a, b) => toMensual(b.monto, b.frecuencia) - toMensual(a.monto, a.frecuencia))
            .map((r) => (
              <RecCard key={r._id} r={r} />
            ))}
        </ul>
      )}
    </Panel>
  )
}

export function Recurrentes({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { estado, loaded } = useData()
  const activos = estado.recurrentes.filter((r) => r.activo)
  const totalGas = activos.filter((r) => r.tipo !== 'ingreso').reduce((s, r) => s + toMensual(r.monto, r.frecuencia), 0)
  const totalIng = activos.filter((r) => r.tipo === 'ingreso').reduce((s, r) => s + toMensual(r.monto, r.frecuencia), 0)
  const neto = totalIng - totalGas
  return (
    <TabContent id="recurrentes" active={active}>
      <div className="space-y-4">
        <Resumen
          id="rec-total"
          titulo="Neto mensual"
          loaded={loaded}
          valor={
            <>
              {signStr(neto)}
              {cop(Math.abs(neto))}
            </>
          }
          valorClassName={neto < 0 ? 'text-deudas' : undefined}
          color="bg-muted-foreground"
          segmentos={activos.filter((r) => r.tipo !== 'ingreso').map((r) => ({ key: String(r._id), label: r.nombre, valor: toMensual(r.monto, r.frecuencia) }))}
          dato={
            <span className="text-muted-foreground">
              entran <strong className="font-semibold text-cartera">{cop(totalIng)}</strong> · salen <strong className="font-semibold text-foreground">{cop(totalGas)}</strong> en fijos
            </span>
          }
          extra={
            <Button size="sm" className="add-btn hidden md:inline-flex" onClick={() => openRecurrenteForm(ctx)}>
              <Plus aria-hidden="true" />
              Nuevo
            </Button>
          }
        />
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Lista id="rec-ingresos" titulo="Ingresos recurrentes" items={estado.recurrentes.filter((r) => r.tipo === 'ingreso')} emptyMsg="Sin ingresos recurrentes." loaded={loaded} />
          <Lista id="rec-gastos" titulo="Gastos fijos" items={estado.recurrentes.filter((r) => r.tipo !== 'ingreso')} emptyMsg="Sin gastos recurrentes." loaded={loaded} />
        </div>
      </div>
    </TabContent>
  )
}
