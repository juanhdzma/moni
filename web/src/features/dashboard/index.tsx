import { TabContent, type TabProps } from '../../shell/TabContent'

const kpi = (id: string, label: string, hero = false) => (
  <div className={hero ? 'card stat-hero' : 'card'} id={id}>
    <div className="stat-label">{label}</div>
    <div className="stat-value">
      <span className="skeleton" style={{ width: hero ? 110 : 90, height: 32 }}></span>
    </div>
    <div className="stat-sub"></div>
  </div>
)

export function Dashboard({ active }: TabProps) {
  return (
    <TabContent id="dashboard" active={active}>
      <div className="grid-5 dash-kpis">
        {kpi('stat-networth', 'Net worth', true)}
        <div className="stat-pair">
          {kpi('stat-balance', 'Cartera')}
          {kpi('stat-inversiones', 'Inversiones')}
        </div>
        <div className="stat-pair">
          {kpi('stat-activos', 'Activos')}
          {kpi('stat-deudas', 'Deudas')}
        </div>
      </div>
      <div className="dash-main-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">
              Gastos por categoría <span className="chart-title-note">efectivo + tarjeta</span>
            </div>
            <div className="period-pills" id="gastos-period-pills"></div>
          </div>
          <div id="gastos-bar-wrap" className="chart-wrap"></div>
        </div>
        <div className="dash-col-stack">
          <div className="chart-card dash-stack-item">
            <div className="chart-header">
              <div className="chart-title">Evolución net worth</div>
              <div className="period-pills" id="nw-period-pills"></div>
            </div>
            <div className="chart-wrap" id="dash-evolution-wrap"></div>
          </div>
          <div className="chart-card dash-stack-item">
            <div className="chart-header">
              <div className="chart-title">Evolución de inversiones</div>
              <div className="period-pills" id="inv-period-pills"></div>
            </div>
            <div className="chart-wrap" id="chart-inversiones-evol-wrap"></div>
          </div>
        </div>
        <div className="dash-col-stack">
          <div className="card dash-list-card dash-stack-item">
            <div className="section-title">Últimos movimientos</div>
            <div className="recent-list" id="recent-list"></div>
          </div>
          <div className="card dash-list-card dash-stack-item">
            <div className="section-title">Próximas operaciones</div>
            <div className="recent-list" id="dash-upcoming"></div>
          </div>
        </div>
      </div>
    </TabContent>
  )
}
