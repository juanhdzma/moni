import type { ChangeEvent } from 'react'
import { Panel } from '@/components/panel'
import { cargarBackup, importarBackup } from '../../lib/api'
import { useData } from '@/shell/providers/DataProvider'
import { StatusMessage } from '../../controls/FormStatus'
import { Hint } from '../../controls/Hint'
import { useStatus } from '@/shell/hooks/useStatus'

export function BackupPanel() {
  const { reload, estado } = useData()
  const status = useStatus()

  const exportar = async () => {
    try {
      const data = await cargarBackup()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moni-backup-${estado.hoy}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      status.err(err)
    }
  }

  const importar = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    status.info('Importando...')
    try {
      const payload: unknown = JSON.parse(await file.text())
      const result = await importarBackup(payload)
      await reload()
      status.ok(result.texto)
    } catch (err) {
      status.err(err)
    } finally {
      input.value = ''
    }
  }

  return (
    <Panel id="settings-backup-card" titulo="Backup">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-accent btn-sm" onClick={() => void exportar()}>
          Exportar JSON
        </button>
        <label className="btn btn-dim btn-sm m-0 cursor-pointer">
          Importar JSON
          <input type="file" accept="application/json" className="hidden" onChange={(e) => void importar(e)} />
        </label>
      </div>
      <Hint className="mt-2">
        Importar solo agrega filas del archivo; no reemplaza lo que ya tenés. Si los ids chocan con datos existentes, fallará.
      </Hint>
      <StatusMessage cls={status.cls} msg={status.msg} id="settings-backup-status" />
    </Panel>
  )
}

