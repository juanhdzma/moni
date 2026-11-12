import { TabContent, type TabProps } from '../../shell/TabContent'

export function Settings({ active }: TabProps) {
  return (
    <TabContent id="settings" active={active}>
      <div className="card settings-card">
        <div className="section-title">🏷️ Categorías</div>
        <div id="settings-categorias"></div>
      </div>
      <div className="card settings-card">
        <div className="section-title">🕓 Próximas operaciones ocultas</div>
        <div id="settings-skipped"></div>
      </div>
      <div className="card settings-card">
        <div className="section-title">💱 Moneda</div>
        <div id="settings-currency"></div>
      </div>
      <div className="card settings-card">
        <div className="section-title">💾 Backup</div>
        <div id="settings-backup"></div>
      </div>
      <div className="card settings-card settings-danger-card">
        <div className="section-title">⚠️ Zona de peligro</div>
        <div id="settings-danger"></div>
      </div>
    </TabContent>
  )
}
