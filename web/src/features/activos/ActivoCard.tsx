import { Monto } from '@/components/Monto'
import { CLASE_TARJETA, Desactualizado } from '@/components/Panel'
import { cn } from '@/lib/utils'
import { fmtDate, pct } from '@/lib/format'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { useData } from '@/shell/providers/DataProvider'
import { useOpenerCtx } from '@/shell/hooks/acciones/openers'
import type { Activo } from '@/types'
import { openActivoFormById, openActivoSellFormById, openActivoUpdateFormById } from './forms/openers'

export function ActivoCard({ activo: a }: { activo: Activo }) {
  const { cop } = useMoneda()
  const ctx = useOpenerCtx()
  const { estado } = useData()

  return (
    <article className={cn(CLASE_TARJETA, 'asset-card flex flex-col')}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="inv-name min-w-0 truncate text-body font-semibold">{a.nombre}</h3>
        <div className="flex shrink-0 items-center gap-1">
          {a.desactualizado && <Desactualizado texto={estado.desactualizado.texto} />}
          <Monto valor={a.cambio_pct} tono={a.cambio_tono} signo={a.cambio_signo} formato={pct} sufijo="%" chip className="rounded-full px-2 py-0.5 text-xs font-medium" />
        </div>
      </div>
      <div className="mt-2.5 text-display leading-tight font-semibold tracking-tight text-activos-text">{cop(a.valor_actual)}</div>
      <div className="mt-2 flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">Compra {cop(a.valor_inicial)}</span>
        <Monto valor={a.cambio} tono={a.cambio_tono} signo={a.cambio_signo} className="font-semibold" />
      </div>
      {a.fecha_adquisicion && <div className="mt-0.5 text-xs text-muted-foreground">Adquirido {fmtDate(a.fecha_adquisicion)}</div>}
      <div className="card-actions mt-4 flex gap-2">
        <button className="btn btn-accent btn-sm flex-1" onClick={() => openActivoUpdateFormById(ctx, a.id)}>Actualizar valor</button>
        <button className="btn btn-dim btn-sm text-deudas" onClick={() => openActivoSellFormById(ctx, a.id)}>Vender</button>
        <button className="btn btn-dim btn-sm" onClick={() => openActivoFormById(ctx, a.id)}>Editar</button>
      </div>
    </article>
  )
}
