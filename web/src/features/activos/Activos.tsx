import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import { openActivoForm } from './forms'

export function Activos({ active }: TabProps) {
  const ctx = useOpenerCtx()
  return (
    <TabContent id="activos" active={active}>
      <div className="tab-header">
        <button className="btn btn-accent add-btn" onClick={() => openActivoForm(ctx)}>
          + Nuevo activo
        </button>
      </div>
      <div className="card" style={{ marginBottom: 16 }} id="activos-total">
        <div className="stat-label">Activos</div>
        <div className="stat-value">
          <span className="skeleton" style={{ width: 140, height: 28 }}></span>
        </div>
      </div>
      <div className="grid-2" id="activos-grid"></div>
    </TabContent>
  )
}
