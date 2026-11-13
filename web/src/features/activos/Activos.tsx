import { Button } from '@/components/ui/button'
import { AlertTriangle, Plus } from 'lucide-react'
import { Panel } from '@/components/panel'
import { cn } from '@/lib/utils'
import { cop, fmtDate, isStale, pct, signStr } from '../../lib/format'
import { useData } from '../../shell/DataProvider'
import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import { fraseActivos } from './frase'
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
      <div className="space-y-3 lg:space-y-4">
        <Panel id="activos-total" titulo="Activos" extra={<Button size="sm" className="add-btn hidden md:inline-flex" onClick={() => openActivoForm(ctx)}><Plus aria-hidden="true" />Nuevo activo</Button>} frase={loaded ? fraseActivos(activos.length, totalAct, totalIni) : undefined}>
          {loaded ? (
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Valor actual</dt>
                <dd className="text-lg font-semibold text-activos-text">{cop(totalAct)}</dd>
                <dd className="text-xs text-muted-foreground">{activos.length} activo{activos.length !== 1 ? 's' : ''}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Costo inicial</dt>
                <dd className="text-lg font-semibold">{cop(totalIni)}</dd>
                <dd className="text-xs text-muted-foreground">invertido</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Variación</dt>
                <dd className={cn('text-lg font-semibold', tinta(variacion))}>
                  {signStr(variacion)}{cop(Math.abs(variacion))}
                </dd>
                <dd>
                  <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', chip(variacion))}>
                    {signStr(varPct)}{pct(Math.abs(varPct))}%
                  </span>
                </dd>
              </div>
            </dl>
          ) : (
            <span className="skeleton block h-8 w-40 animate-pulse rounded-md bg-muted" aria-label="Cargando" />
          )}
        </Panel>
        <div id="activos-grid" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {loaded && !activos.length && (
            <div className="col-span-full rounded-xl border bg-card p-6 text-center">
              <div className="text-sm font-semibold">Sin activos</div>
              <div className="mt-1 text-sm text-muted-foreground">Registrá propiedades, vehículos u otros bienes con el botón Nuevo activo.</div>
            </div>
          )}
          {activos.map((a) => {
            const cambio = a.valor_actual - a.valor_inicial
            const cambioPct = a.valor_inicial > 0 ? (cambio / a.valor_inicial) * 100 : 0
            return (
              <article className="asset-card flex flex-col rounded-xl border bg-card p-4 text-card-foreground" key={a._id}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="inv-name min-w-0 truncate text-sm font-semibold">{a.nombre}</h3>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', chip(cambio))}>
                    {signStr(cambioPct)}{pct(Math.abs(cambioPct))}%
                  </span>
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-activos-text">{cop(a.valor_actual)}</div>
                <div className="mt-1 flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Compra {cop(a.valor_inicial)}</span>
                  <span className={cn('font-semibold', tinta(cambio))}>
                    {signStr(cambio)}{cop(Math.abs(cambio))}
                  </span>
                </div>
                {a.fecha_adquisicion && <div className="mt-1 text-xs text-muted-foreground">Adquirido {fmtDate(a.fecha_adquisicion)}</div>}
                {isStale(a.valor_actualizado_en) && (
                  <div className="stale-warning mt-2 flex items-center gap-1.5 text-xs text-alerta-text">
                    <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                    Valor sin actualizar hace más de 1 mes
                  </div>
                )}
                <div className="card-actions mt-3 flex gap-2">
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
