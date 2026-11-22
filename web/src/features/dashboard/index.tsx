import { cargarResumenDashboard } from '@/lib/api'
import { useData } from '@/shell/DataProvider'
import { TabContent, type TabProps } from '@/shell/TabContent'
import { useVista } from '@/shell/useVista'
import { EsteMes } from './EsteMes'
import { Evolucion } from './Evolucion'
import { Gastos } from './Gastos'
import { Movimientos } from './Movimientos'
import { Patrimonio } from './Patrimonio'
import { ProximasOperaciones } from './ProximasOperaciones'

export function Dashboard({ active }: TabProps) {
  const { loaded } = useData()
  const { data: r } = useVista('resumen', cargarResumenDashboard)
  const loading = !loaded || r === null

  return (
    <TabContent id="dashboard" active={active}>
      <div className="space-y-3 lg:space-y-4">
        <Patrimonio r={r} loading={loading} />
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
