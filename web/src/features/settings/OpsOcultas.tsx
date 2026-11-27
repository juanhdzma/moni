import { Cargando } from '@/components/Skeleton'
import { Panel } from '@/components/Panel'
import { cargarOpsOcultas, restaurarOp } from '@/lib/api'
import { useData } from '@/shell/providers/DataProvider'
import { useVista } from '@/shell/hooks/datos/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'

export function OpsOcultas() {
  const { mutar, conBanner } = useData()
  const { data, error } = useVista('ops-ocultas', cargarOpsOcultas, DEPENDENCIAS_DE_VISTA.opsOcultas)

  const restaurar = async (clave?: string) => {
    await conBanner(() => mutar((onAfectadas) => restaurarOp(clave, onAfectadas)), { recargar: true })
  }

  return (
    <Panel id="settings-skipped-card" titulo="Próximas operaciones ocultas" error={error}>
      {!data && <Cargando className="py-0 text-left" />}
      {data && !data.items.length && <p className="text-sm text-muted-foreground">{data.texto_vacio}</p>}
      {data && data.items.length > 0 && (
        <>
          <ul className="divide-y">
            {data.items.map((op) => (
              <li className="flex items-center justify-between gap-3 py-2" key={op.clave}>
                <span className="text-xs text-muted-foreground">{op.texto}</span>
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
