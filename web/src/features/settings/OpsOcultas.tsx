import { Panel } from '@/components/panel'
import { cargarOpsOcultas, restaurarOp } from '../../lib/api'
import { errMsg } from '../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useVista } from '@/shell/hooks/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'

function Skipped() {
  const { reload, showBanner } = useData()
  const { data } = useVista('ops-ocultas', cargarOpsOcultas, DEPENDENCIAS_DE_VISTA.opsOcultas)

  const restaurar = async (clave?: string) => {
    try {
      await restaurarOp(clave)
    } catch (err) {
      showBanner(errMsg(err))
    }
    await reload(['opsOcultas'])
  }

  if (!data) return <p className="text-sm text-muted-foreground">Cargando...</p>
  if (!data.items.length) return <p className="text-sm text-muted-foreground">Ninguna operación oculta.</p>
  return (
    <>
      <ul className="divide-y">
        {data.items.map((op) => (
          <li className="flex items-center justify-between gap-3 py-2" key={op.clave}>
            <span className="break-all text-xs text-muted-foreground">
              {op.etiqueta ? `${op.etiqueta} · ` : ''}
              <span className="font-mono">{op.clave}</span>
            </span>
            <button type="button" className="btn btn-dim btn-sm" onClick={() => void restaurar(op.clave)}>
              Restaurar
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-dim btn-sm mt-3" onClick={() => void restaurar()}>
        Restaurar todas
      </button>
    </>
  )
}

export function OpsOcultas() {
  return (
    <Panel id="settings-skipped-card" titulo="Próximas operaciones ocultas">
      <div id="settings-skipped">
        <Skipped />
      </div>
    </Panel>
  )
}
