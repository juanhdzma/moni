import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import { openRecurrenteForm } from './forms'

const col = { display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' } as const

export function Recurrentes({ active }: TabProps) {
  const ctx = useOpenerCtx()
  return (
    <TabContent id="recurrentes" active={active}>
      <div className="tab-header">
        <button className="btn btn-accent add-btn" onClick={() => openRecurrenteForm(ctx)}>
          + Nuevo
        </button>
      </div>
      <div className="card" style={{ marginBottom: 'var(--sp-7)' }} id="rec-total">
        <div className="stat-label">Resumen mensual</div>
        <div className="stat-value">
          <span className="skeleton" style={{ width: 140, height: 28 }}></span>
        </div>
      </div>
      <div className="grid-2">
        <div>
          <div className="section-title">Ingresos recurrentes</div>
          <div id="rec-ingresos" style={col}></div>
        </div>
        <div>
          <div className="section-title">Gastos fijos</div>
          <div id="rec-gastos" style={col}></div>
        </div>
      </div>
    </TabContent>
  )
}
