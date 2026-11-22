import { Button } from '@/components/ui/button'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { Desactualizado, Resumen } from '@/components/panel'
import { cn } from '@/lib/utils'
import { cargarResumenActivos } from '../../lib/api'
import { cop, fmtDate, pct, signStr } from '../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { useVista } from '@/shell/hooks/useVista'
import { TabContent, type TabProps } from '@/shell/layout/TabContent'
import { openActivoForm, openActivoSellForm, openActivoUpdateForm } from './forms'

const tinta = (n: number) => (n >= 0 ? 'text-inversiones-text' : 'text-deudas')
const chip = (n: number) => (n >= 0 ? 'bg-inversiones/15 text-inversiones-text' : 'bg-deudas/15 text-deudas')

export function Activos({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { loaded, estado } = useData()
  const { data: resumen } = useVista('activos-resumen', cargarResumenActivos, ['activos'])
  const activos = resumen?.items ?? []
  const variacion = resumen?.variacion ?? 0

  return (
    <TabContent id="activos" active={active}>
      <div className="space-y-4">
        <Resumen
          id="activos-total"
          titulo="Tus activos"
          loaded={loaded}
          valor={cop(resumen?.total_actual ?? 0)}
          valorClassName="text-activos-text"
          color="bg-activos"
          segmentos={resumen?.segmentos ?? []}
          dato={
            <>
              {(resumen?.total_inicial ?? 0) > 0 && (
                <span className={tinta(variacion)}>
                  {variacion >= 0 ? <ArrowUp className="mr-0.5 inline size-3.5 -translate-y-px" aria-hidden="true" /> : <ArrowDown className="mr-0.5 inline size-3.5 -translate-y-px" aria-hidden="true" />}
                  {resumen?.texto_variacion}
                </span>
              )}
              <span className="text-muted-foreground">
                {(resumen?.total_inicial ?? 0) > 0 && ' · '}
                {resumen?.texto_conteo}
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
          {loaded && resumen && !activos.length && (
            <div className="col-span-full rounded-2xl border bg-card p-6 text-center">
              <div className="text-sm font-semibold">Sin activos</div>
              <div className="mt-1 text-sm text-muted-foreground">Registrá propiedades, vehículos u otros bienes con el botón Nuevo activo.</div>
            </div>
          )}
          {activos.map((a) => {
            const { cambio, cambio_pct: cambioPct } = a
            return (
              <article className="asset-card flex flex-col rounded-2xl border bg-card p-5 text-card-foreground" key={a.id}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="inv-name min-w-0 truncate text-[15px] font-semibold">{a.nombre}</h3>
                  <div className="flex shrink-0 items-center gap-1">
                    {a.desactualizado && <Desactualizado texto={estado.desactualizado.texto} />}
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
                  <button className="btn btn-accent btn-sm flex-1" onClick={() => openActivoUpdateForm(ctx, a)}>Actualizar valor</button>
                  <button className="btn btn-dim btn-sm text-deudas" onClick={() => openActivoSellForm(ctx, a)}>Vender</button>
                  <button className="btn btn-dim btn-sm" onClick={() => openActivoForm(ctx, a)}>Editar</button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </TabContent>
  )
}
