import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { EmptyCard } from '@/components/EmptyCard'
import { Tendencia } from '@/components/monto'
import { Resumen } from '@/components/panel'
import { cargarResumenActivos } from '../../lib/api'
import { cop } from '../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { useVista } from '@/shell/hooks/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import { TabContent, type TabProps } from '@/shell/layout/TabContent'
import { ActivoCard } from './ActivoCard'
import { openActivoForm } from './forms'

export function Activos({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { loaded } = useData()
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
              {resumen?.mostrar_variacion && <Tendencia valor={variacion}>{resumen.texto_variacion}</Tendencia>}
              <span className="text-muted-foreground">
                {resumen?.mostrar_variacion && ' · '}
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
          {activos.map((a) => (
            <ActivoCard key={a.id} activo={a} />
          ))}
        </div>
      </div>
    </TabContent>
  )
}
