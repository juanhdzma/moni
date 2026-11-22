import { useState, type ChangeEvent } from 'react'
import { Panel } from '@/components/panel'
import { apiFetch } from '../../lib/api'
import { errMsg } from '../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { HINT } from './estilos'

function Backup() {
  const { reload, estado } = useData()
  const [status, setStatus] = useState({ cls: 'form-status', msg: '' })

  const exportar = async () => {
    try {
      const data = await apiFetch('/api/all')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moni-backup-${estado.hoy}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setStatus({ cls: 'form-status err', msg: errMsg(err) })
    }
  }

  const importar = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    setStatus({ cls: 'form-status', msg: 'Importando...' })
    try {
      const payload: unknown = JSON.parse(await file.text())
      const result = await apiFetch<Record<string, unknown>>('/api/import', { method: 'POST', body: payload })
      await reload()
      setStatus({
        cls: 'form-status ok',
        msg: 'Importado: ' + Object.entries(result).map(([k, v]) => `${String(v)} ${k}`).join(', '),
      })
    } catch (err) {
      setStatus({ cls: 'form-status err', msg: errMsg(err) })
    } finally {
      input.value = ''
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-accent btn-sm" onClick={() => void exportar()}>
          Exportar JSON
        </button>
        <label className="btn btn-dim btn-sm m-0 cursor-pointer">
          Importar JSON
          <input type="file" accept="application/json" className="hidden" onChange={(e) => void importar(e)} />
        </label>
      </div>
      <div className={HINT}>
        Importar solo agrega filas del archivo; no reemplaza lo que ya tenés. Si los ids chocan con datos existentes, fallará.
      </div>
      <div className={status.cls} id="settings-backup-status" role={status.cls.includes('err') ? 'alert' : undefined}>
        {status.msg}
      </div>
    </>
  )
}

export function BackupPanel() {
  return (
    <Panel id="settings-backup-card" titulo="Backup">
      <div id="settings-backup">
        <Backup />
      </div>
    </Panel>
  )
}
