import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import { openDeudaForm } from './forms'

export function Deudas({ active }: TabProps) {
  const ctx = useOpenerCtx()
  return (
    <TabContent id="deudas" active={active}>
      <div className="tab-header">
        <button className="btn btn-accent add-btn" onClick={() => openDeudaForm(ctx)}>
          + Nueva deuda
        </button>
      </div>
      <div className="card" style={{ marginBottom: 16 }} id="deudas-total">
        <div className="stat-label">Total en deudas</div>
        <div className="stat-value">
          <span className="skeleton" style={{ width: 110, height: 28 }}></span>
        </div>
      </div>
      <div className="grid-2">
        <div>
          <div className="section-title" style={{ marginBottom: 12 }}>
            Créditos
          </div>
          <div id="deudas-grid-credito" className="card-list"></div>
        </div>
        <div>
          <div className="section-title" style={{ marginBottom: 12 }}>
            Tarjetas
          </div>
          <div id="deudas-grid-tarjeta" className="card-list"></div>
        </div>
      </div>
      <div id="deudas-terminados"></div>
    </TabContent>
  )
}
