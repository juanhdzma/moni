import { cargarResumenDashboard } from '@/lib/api'
import { useData } from '@/shell/providers/DataProvider'
import { TabContent, type TabProps } from '@/shell/layout/TabContent'
import { useVista } from '@/shell/hooks/datos/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import { EsteMes } from './components/EsteMes'
import { Evolucion } from './components/Evolucion'
import { Gastos } from './components/Gastos'
import { Movimientos } from './components/Movimientos'
import { Patrimonio } from './components/Patrimonio'
import { ProximasOperaciones } from './components/ProximasOperaciones'

export function Dashboard({ active }: TabProps) {
  const { loaded } = useData()
  const { data: r, error } = useVista('resumen', cargarResumenDashboard, DEPENDENCIAS_DE_VISTA.resumenDashboard)
  const loading = !loaded || r === null

  return (
    <TabContent id="dashboard" active={active}>
      <div className="space-y-3 lg:space-y-4">
        <Patrimonio r={r} loading={loading} error={error} />
        <div className="grid gap-3 lg:grid-cols-12 lg:items-start lg:gap-4">
          <div className="contents lg:col-span-7 lg:block lg:space-y-4">
            <div className="order-1">
              <Evolucion />
            </div>
            <div className="order-2">
              <Gastos />
            </div>
            <div className="order-5">
              <Movimientos />
            </div>
          </div>
          <div className="contents lg:col-span-5 lg:block lg:space-y-4">
            <div className="order-3">
              <EsteMes />
            </div>
            <div className="order-4">
              <ProximasOperaciones />
            </div>
          </div>
        </div>
      </div>
    </TabContent>
  )
}
