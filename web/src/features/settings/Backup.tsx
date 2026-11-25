import type { ChangeEvent } from 'react'
import { Panel } from '@/components/panel'
import { StatusMessage } from '@/controls/FormStatus'
import { Hint } from '@/controls/Hint'
import { cargarBackup, importarBackup } from '@/lib/api'
import { useStatus } from '@/shell/hooks/useStatus'
import { useData } from '@/shell/providers/DataProvider'
import { useModal } from '@/shell/providers/ModalProvider'
import { ConfirmarClave } from './ConfirmarClave'

type Backup = Record<string, unknown>

function leerBackup(texto: string): Backup {
  const payload: unknown = JSON.parse(texto)
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) throw new Error('El archivo no es un backup válido')
  return payload as Backup
}

export function BackupPanel() {
  const { estado, mutar } = useData()
  const { openModal } = useModal()
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
    try {
      const payload = leerBackup(await file.text())
      status.limpiar()
      openModal(
        'Importar backup',
        <ConfirmarClave
          etiqueta="Importar"
          descripcion="Importar agrega las filas del archivo a tus datos. Confirmá con tu clave para continuar."
          onConfirmar={async (clave) => {
            const result = await mutar((onAfectadas) => importarBackup(payload, clave, onAfectadas))
            status.ok(result.texto)
          }}
        />,
      )
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
        <label className="btn btn-dim btn-sm m-0 cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring">
          Importar JSON
          <input type="file" accept="application/json" className="sr-only" onChange={(e) => void importar(e)} />
        </label>
      </div>
      <Hint className="mt-2">
        Importar solo agrega filas del archivo; no reemplaza lo que ya tenés. Si los ids chocan con datos existentes, fallará.
      </Hint>
      <StatusMessage cls={status.cls} msg={status.msg} id="settings-backup-status" />
    </Panel>
  )
}
