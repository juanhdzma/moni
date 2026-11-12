import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import { openTxForm } from './forms'

export function Transacciones({ active }: TabProps) {
  const ctx = useOpenerCtx()
  return (
    <TabContent id="transacciones" active={active}>
      <div className="filters-bar" style={{ marginBottom: 18 }}>
        <div className="tx-filter-pills" id="tx-filter-pills"></div>
        <button
          className="btn btn-accent btn-sm add-btn"
          style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}
          onClick={() => openTxForm(ctx)}
        >
          + Nuevo movimiento
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Método de pago</th>
            </tr>
          </thead>
          <tbody id="tx-tbody"></tbody>
        </table>
      </div>
    </TabContent>
  )
}
