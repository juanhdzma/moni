import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { EmptyCard } from '@/components/EmptyCard'
import { Monto, Tendencia } from '@/components/monto'
import { Desactualizado, Resumen } from '@/components/panel'
import { cargarResumenActivos } from '../../lib/api'
import { cop, fmtDate, pct } from '../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { useVista } from '@/shell/hooks/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import { TabContent, type TabProps } from '@/shell/layout/TabContent'
import { openActivoForm, openActivoSellForm, openActivoUpdateForm } from './forms'

export function Activos({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { loaded, estado } = useData()
  const { data: resumen } = useVista('activos-resumen', cargarResumenActivos, DEPENDENCIAS_DE_VISTA.resumenActivos)
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
                <Tendencia valor={variacion}>{resumen?.texto_variacion}</Tendencia>
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
            <EmptyCard className="col-span-full rounded-2xl border bg-card p-6" titulo="Sin activos" texto="Registrá propiedades, vehículos u otros bienes con el botón Nuevo activo." />
          )}
          {activos.map((a) => {
            const { cambio, cambio_pct: cambioPct } = a
            return (
              <article className="asset-card flex flex-col rounded-2xl border bg-card p-5 text-card-foreground" key={a.id}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="inv-name min-w-0 truncate text-[15px] font-semibold">{a.nombre}</h3>
                  <div className="flex shrink-0 items-center gap-1">
                    {a.desactualizado && <Desactualizado texto={estado.desactualizado.texto} />}
                    <Monto valor={cambioPct} formato={pct} sufijo="%" chip className="rounded-full px-2 py-0.5 text-xs font-medium" />
                  </div>
                </div>
                <div className="mt-2.5 text-[28px] leading-tight font-semibold tracking-tight text-activos-text">{cop(a.valor_actual)}</div>
                <div className="mt-2 flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Compra {cop(a.valor_inicial)}</span>
                  <Monto valor={cambio} className="font-semibold" />
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
