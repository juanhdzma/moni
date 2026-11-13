import { useMemo } from 'react'
import { resumenDashboard } from '@/lib/dinero'
import { useData } from '@/shell/DataProvider'
import { TabContent, type TabProps } from '@/shell/TabContent'
import { EsteMes } from './EsteMes'
import { Evolucion } from './Evolucion'
import { Gastos } from './Gastos'
import { Movimientos } from './Movimientos'
import { Patrimonio } from './Patrimonio'
import { ProximasOperaciones } from './ProximasOperaciones'

export function Dashboard({ active }: TabProps) {
  const { estado, loaded, version } = useData()
  const loading = !loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps -- version recomputes against the clock after refresh()
  const r = useMemo(() => resumenDashboard(estado), [estado, version])

  return (
    <TabContent id="dashboard" active={active}>
      <div className="space-y-3 lg:space-y-4">
        <Patrimonio r={r} estado={estado} loading={loading} />
        <div className="grid gap-3 lg:grid-cols-12 lg:items-start lg:gap-4">
          <div className="contents lg:col-span-7 lg:block lg:space-y-4">
            <div className="order-1">
              <Evolucion estado={estado} patrimonio={r.patrimonio} totalInv={r.totalInv} loading={loading} />
            </div>
            <div className="order-2">
              <Gastos />
            </div>
            <div className="order-5">
              <Movimientos transacciones={estado.transacciones} loading={loading} />
            </div>
          </div>
          <div className="contents lg:col-span-5 lg:block lg:space-y-4">
            <div className="order-3">
              <EsteMes r={r} transacciones={estado.transacciones} loading={loading} />
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
