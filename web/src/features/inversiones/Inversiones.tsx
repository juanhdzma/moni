import { Plus, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyCard } from '@/components/EmptyCard'
import { Monto, Tendencia } from '@/components/monto'
import { Desactualizado, Panel, Resumen } from '@/components/panel'
import { cargarResumenInversiones } from '@/lib/api'
import { fmtDate, pct } from '@/lib/format'
import { useMeta } from '@/shell/hooks/useMeta'
import { useMoneda } from '@/shell/hooks/useMoneda'
import { useData } from '@/shell/providers/DataProvider'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { useVista } from '@/shell/hooks/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import { TabContent, type TabProps } from '@/shell/layout/TabContent'
import type { Inversion, TextoVacio } from '@/types'
import {
  openInvAddMoreFormById,
  openInvForm,
  openInvFormById,
  openInvRetirarFormById,
  openInvUpdateValueFormById,
  openInvYieldFormById,
} from './forms/openers'

function SinInversiones({ vacio }: { vacio: TextoVacio }) {
  return (
    <EmptyCard
      como="li"
      titulo={vacio.titulo}
      texto={vacio.texto}
      icono={<TrendingUp className="size-5" aria-hidden="true" />}
    />
  )
}

function InvCard({ inv }: { inv: Inversion }) {
  const { cop } = useMoneda()
  const ctx = useOpenerCtx()
  const { estado } = useData()
  const generaRendimiento = useMeta()?.tipos_inversion.find((t) => t.value === inv.tipo)?.campos.includes('tasa')
  const gan = inv.ganancia
  const ganP = inv.ganancia_pct
  const nextPago = inv.proximo_pago?.texto ?? null

  return (
    <li className="inv-card py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="inv-name min-w-0 truncate text-body font-semibold">{inv.nombre}</div>
        <div className="flex shrink-0 items-center gap-1">
          {inv.desactualizado && <Desactualizado texto={estado.desactualizado.texto} />}
          <Monto valor={ganP} formato={pct} sufijo="%" className="text-sm font-semibold" />
        </div>
      </div>
      {inv.texto_tasa && (
        <div className="text-xs text-muted-foreground">
          {inv.texto_tasa}
          {nextPago ? (
            <>
              {' · '}
              <strong className="font-semibold text-foreground">{nextPago}</strong>
            </>
          ) : null}
        </div>
      )}
      <div className="mt-1 text-2xl font-semibold tracking-tight text-inversiones-text">{cop(inv.valor_actual)}</div>
      <div className="mt-0.5 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Invertido {cop(inv.monto_invertido)}</span>
        <Monto valor={gan} className="font-semibold" />
      </div>
      {inv.fecha_inicio ? <div className="mt-0.5 text-xs text-muted-foreground">Desde {fmtDate(inv.fecha_inicio)}</div> : null}
      <div className="card-actions mt-4 flex flex-wrap gap-2">
        {generaRendimiento === undefined ? null : generaRendimiento ? (
          <button className="btn btn-accent btn-sm flex-1" onClick={() => openInvYieldFormById(ctx, inv.id)}>
            Rendimiento
          </button>
        ) : (
          <button className="btn btn-accent btn-sm flex-1" onClick={() => openInvUpdateValueFormById(ctx, inv.id)}>
            Actualizar
          </button>
        )}
        <button className="btn btn-dim btn-sm" onClick={() => openInvAddMoreFormById(ctx, inv.id)}>
          + Más
        </button>
        <button className="btn btn-dim btn-sm text-deudas" onClick={() => openInvRetirarFormById(ctx, inv.id)}>
          Retirar
        </button>
        <button className="btn btn-dim btn-sm" onClick={() => openInvFormById(ctx, inv.id)}>
          Editar
        </button>
      </div>
    </li>
  )
}

export function Inversiones({ active }: TabProps) {
  const { cop } = useMoneda()
  const ctx = useOpenerCtx()
  const { loaded: cargado } = useData()
  const { data } = useVista('inv-resumen', cargarResumenInversiones, DEPENDENCIAS_DE_VISTA.resumenInversiones)
  const loaded = cargado && data !== null
  const totalActual = data?.total_actual ?? 0
  const ganancia = data?.ganancia ?? 0
  const fijas = data?.fijas ?? []
  const variables = data?.variables ?? []

  return (
    <TabContent id="inversiones" active={active}>
      <div className="space-y-4">
        <Resumen
          id="inv-total"
          titulo="Tus inversiones"
          loaded={loaded}
          valor={cop(totalActual)}
          valorClassName="text-inversiones-text"
          color="bg-inversiones"
          segmentos={data?.segmentos ?? []}
          dato={
            <>
              {data?.mostrar_ganancia && <Tendencia valor={ganancia}>{data.texto_ganancia}</Tendencia>}
              <span className="text-muted-foreground">
                {data?.mostrar_ganancia && ' · '}
                {data?.texto_posiciones}
              </span>
            </>
          }
          extra={
            <Button size="sm" className="add-btn hidden md:inline-flex" onClick={() => openInvForm(ctx)}>
              <Plus aria-hidden="true" />
              Nueva inversión
            </Button>
          }
        />
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Panel id="inv-fijas" titulo="Fijas">
            <ul id="inv-grid-fija" className="card-list divide-y">
              {loaded && (fijas.length ? fijas.map((i) => <InvCard key={i.id} inv={i} />) : data && <SinInversiones vacio={data.texto_vacio_fijas} />)}
            </ul>
          </Panel>
          <Panel id="inv-variables" titulo="Variables">
            <ul id="inv-grid-variable" className="card-list divide-y">
              {loaded && (variables.length ? variables.map((i) => <InvCard key={i.id} inv={i} />) : data && <SinInversiones vacio={data.texto_vacio_variables} />)}
            </ul>
          </Panel>
        </div>
      </div>
    </TabContent>
  )
}
