import { Panel } from '@/components/panel'
import { TabContent, type TabProps } from '@/shell/layout/TabContent'
import { BackupPanel } from './Backup'
import { Categorias } from './Categorias'
import { Moneda } from './Moneda'
import { Notificaciones } from './Notificaciones'
import { OpsOcultas } from './OpsOcultas'
import { Peligro } from './Peligro'
import { Seguridad } from './Seguridad'

export function Settings({ active }: TabProps) {
  return (
    <TabContent id="settings" active={active}>
      <div className="space-y-3 lg:space-y-4">
        <Categorias />
        <div className="grid gap-3 md:grid-cols-2 lg:gap-4">
          <OpsOcultas />
          <Moneda />
          <Panel id="settings-notificaciones-card" titulo="Notificaciones">
            <Notificaciones />
          </Panel>
          <Panel id="settings-seguridad-card" titulo="Seguridad">
            <Seguridad />
          </Panel>
          <BackupPanel />
          <Peligro />
        </div>
      </div>
    </TabContent>
  )
}
