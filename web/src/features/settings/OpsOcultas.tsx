import { Cargando } from '@/components/Cargando'
import { Panel } from '@/components/panel'
import { cargarOpsOcultas, restaurarOp } from '../../lib/api'
import { useData } from '@/shell/providers/DataProvider'
import { useVista } from '@/shell/hooks/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'

export function OpsOcultas() {
  const { reload, conBanner } = useData()
  const { data } = useVista('ops-ocultas', cargarOpsOcultas, DEPENDENCIAS_DE_VISTA.opsOcultas)

  const restaurar = async (clave?: string) => {
    if (await conBanner(() => restaurarOp(clave), { recargar: true })) await reload(['opsOcultas'])
  }

  return (
    <Panel id="settings-skipped-card" titulo="Próximas operaciones ocultas">
      {!data && <Cargando className="py-0 text-left" />}
      {data && !data.items.length && <p className="text-sm text-muted-foreground">Ninguna operación oculta.</p>}
      {data && data.items.length > 0 && (
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
      )}
    </Panel>
  )
}
