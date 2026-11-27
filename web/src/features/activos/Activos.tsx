import { BotonNuevo } from '@/components/BotonNuevo'
import { EmptyCard } from '@/components/EmptyCard'
import { Tendencia } from '@/components/Monto'
import { CLASE_TARJETA, Resumen } from '@/components/Panel'
import { cn } from '@/lib/utils'
import { cargarResumenActivos } from '@/lib/api'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { useData } from '@/shell/providers/DataProvider'
import { useOpenerCtx } from '@/shell/hooks/acciones/openers'
import { useVista } from '@/shell/hooks/datos/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import { TabContent, type TabProps } from '@/shell/layout/TabContent'
import { ActivoCard } from './ActivoCard'
import { openActivoForm } from './forms/openers'

export function Activos({ active }: TabProps) {
  const { cop } = useMoneda()
  const ctx = useOpenerCtx()
  const { loaded } = useData()
  const { data: resumen, error } = useVista('activos-resumen', cargarResumenActivos, DEPENDENCIAS_DE_VISTA.resumenActivos)
  const activos = resumen?.items ?? []

  return (
    <TabContent id="activos" active={active}>
      <div className="space-y-4">
        <Resumen
          id="activos-total"
          titulo="Tus activos"
          loaded={loaded}
          error={error}
          valor={cop(resumen?.total_actual ?? 0)}
          valorClassName="text-activos-text"
          color="bg-activos"
          segmentos={resumen?.segmentos ?? []}
          dato={
            <>
              {resumen?.mostrar_variacion && <Tendencia tono={resumen.variacion_tono} signo={resumen.variacion_signo}>{resumen.texto_variacion}</Tendencia>}
              <span className="text-muted-foreground">
                {resumen?.mostrar_variacion && ' · '}
                {resumen?.texto_conteo}
              </span>
            </>
          }
          extra={
            <BotonNuevo label="Nuevo activo" onClick={() => openActivoForm(ctx)} />
          }
        />
        <div id="activos-grid" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loaded && resumen && !activos.length && (
            <EmptyCard className={cn(CLASE_TARJETA, 'col-span-full')} titulo={resumen.texto_vacio.titulo} texto={resumen.texto_vacio.texto} />
          )}
          {activos.map((a) => (
            <ActivoCard key={a.id} activo={a} />
          ))}
        </div>
      </div>
    </TabContent>
  )
}
