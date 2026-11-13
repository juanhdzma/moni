import { Button } from '@/components/ui/button'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { Desactualizado, Resumen } from '@/components/panel'
import { cn } from '@/lib/utils'
import { cop, fmtDate, isStale, pct, signStr } from '../../lib/format'
import { useData } from '../../shell/DataProvider'
import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import { openActivoForm, openActivoFormById, openActivoSellFormById, openActivoUpdateFormById } from './forms'

const tinta = (n: number) => (n >= 0 ? 'text-inversiones-text' : 'text-deudas')
const chip = (n: number) => (n >= 0 ? 'bg-inversiones/15 text-inversiones-text' : 'bg-deudas/15 text-deudas')

export function Activos({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { estado, loaded } = useData()
  const activos = estado.activos

  const totalIni = activos.reduce((s, a) => s + a.valor_inicial, 0)
  const totalAct = activos.reduce((s, a) => s + a.valor_actual, 0)
  const variacion = totalAct - totalIni
  const varPct = totalIni > 0 ? (variacion / totalIni) * 100 : 0

  return (
    <TabContent id="activos" active={active}>
      <div className="space-y-4">
        <Resumen
          id="activos-total"
          titulo="Tus activos"
          loaded={loaded}
          valor={cop(totalAct)}
          valorClassName="text-activos-text"
          color="bg-activos"
          segmentos={activos.map((a) => ({ key: String(a._id), label: a.nombre, valor: a.valor_actual }))}
          dato={
            <>
              {totalIni > 0 && (
                <span className={tinta(variacion)}>
                  {variacion >= 0 ? <ArrowUp className="mr-0.5 inline size-3.5 -translate-y-px" aria-hidden="true" /> : <ArrowDown className="mr-0.5 inline size-3.5 -translate-y-px" aria-hidden="true" />}
                  {pct(Math.abs(varPct))}% sobre lo pagado
                </span>
              )}
              <span className="text-muted-foreground">
                {totalIni > 0 && ' · '}
                {activos.length} activo{activos.length !== 1 ? 's' : ''}
              </span>
            </>
          }
          extra={
            <Button size="sm" className="add-btn hidden md:inline-flex" onClick={() => openActivoForm(ctx)}>
              <Plus aria-hidden="true" />
              Nuevo activo
            </Button>
          }
        />
        <div id="activos-grid" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loaded && !activos.length && (
            <div className="col-span-full rounded-2xl border bg-card p-6 text-center">
              <div className="text-sm font-semibold">Sin activos</div>
              <div className="mt-1 text-sm text-muted-foreground">Registrá propiedades, vehículos u otros bienes con el botón Nuevo activo.</div>
            </div>
          )}
          {activos.map((a) => {
            const cambio = a.valor_actual - a.valor_inicial
            const cambioPct = a.valor_inicial > 0 ? (cambio / a.valor_inicial) * 100 : 0
            return (
              <article className="asset-card flex flex-col rounded-2xl border bg-card p-5 text-card-foreground" key={a._id}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="inv-name min-w-0 truncate text-[15px] font-semibold">{a.nombre}</h3>
                  <div className="flex shrink-0 items-center gap-1">
                    {isStale(a.valor_actualizado_en) && <Desactualizado />}
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', chip(cambio))}>
                      {signStr(cambioPct)}{pct(Math.abs(cambioPct))}%
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 text-[28px] leading-tight font-semibold tracking-tight text-activos-text">{cop(a.valor_actual)}</div>
                <div className="mt-2 flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Compra {cop(a.valor_inicial)}</span>
                  <span className={cn('font-semibold', tinta(cambio))}>
                    {signStr(cambio)}{cop(Math.abs(cambio))}
                  </span>
                </div>
                {a.fecha_adquisicion && <div className="mt-0.5 text-xs text-muted-foreground">Adquirido {fmtDate(a.fecha_adquisicion)}</div>}
                <div className="card-actions mt-4 flex gap-2">
                  <button className="btn btn-accent btn-sm flex-1" onClick={() => openActivoUpdateFormById(ctx, a._id)}>Actualizar valor</button>
                  <button className="btn btn-dim btn-sm text-deudas" onClick={() => openActivoSellFormById(ctx, a._id)}>Vender</button>
                  <button className="btn btn-dim btn-sm" onClick={() => openActivoFormById(ctx, a._id)}>Editar</button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </TabContent>
  )
}
