import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import { openInvForm } from './forms'

export function Inversiones({ active }: TabProps) {
  const ctx = useOpenerCtx()
  return (
    <TabContent id="inversiones" active={active}>
      <div className="tab-header">
        <button className="btn btn-accent add-btn" onClick={() => openInvForm(ctx)}>
          + Nueva inversión
        </button>
      </div>
      <div className="card" style={{ marginBottom: 16 }} id="inv-total">
        <div className="stat-label">Portfolio</div>
        <div className="stat-value">
          <span className="skeleton" style={{ width: 140, height: 28 }}></span>
        </div>
      </div>
      <div className="grid-2">
        <div>
          <div className="section-title" style={{ marginBottom: 12 }}>
            Fijas
          </div>
          <div id="inv-grid-fija" className="card-list"></div>
        </div>
        <div>
          <div className="section-title" style={{ marginBottom: 12 }}>
            Variables
          </div>
          <div id="inv-grid-variable" className="card-list"></div>
        </div>
      </div>
    </TabContent>
  )
}
