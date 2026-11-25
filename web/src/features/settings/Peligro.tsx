import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Panel } from '@/components/panel'
import { Campo } from '@/controls/Campo'
import { vaciarDatos } from '@/lib/api'
import { useMeta } from '@/shell/hooks/useMeta'
import { useData } from '@/shell/providers/DataProvider'
import { useModal } from '@/shell/providers/ModalProvider'
import type { Meta } from '@/types'
import { ConfirmarClave } from './ConfirmarClave'

function TruncateConfirm({ truncate }: { truncate: Meta['truncate'] }) {
  const { mutar } = useData()
  const [val, setVal] = useState('')

  return (
    <ConfirmarClave
      peligro
      etiqueta="Borrar todo"
      descripcion={`${truncate.texto} Esta acción no se puede deshacer. Exportá un backup antes si no estás seguro.`}
      validar={() => (val.trim() === truncate.palabra ? null : `Escribí ${truncate.palabra} (en mayúsculas) para confirmar`)}
      onConfirmar={(clave) => mutar((onAfectadas) => vaciarDatos(clave, onAfectadas))}
      extra={
        <Campo id="m-confirm-truncate" label={`Escribí ${truncate.palabra} para confirmar`}>
          <input
            className="form-input"
            type="text"
            id="m-confirm-truncate"
            placeholder={truncate.palabra}
            autoComplete="off"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        </Campo>
      }
    />
  )
}

export function Peligro() {
  const { openModal } = useModal()
  const truncate = useMeta()?.truncate

  return (
    <Panel
      id="settings-danger-card"
      titulo="Zona de peligro"
      className="border-deudas/40"
      extra={<TriangleAlert className="size-4 text-deudas" aria-hidden="true" />}
    >
      <div className="mb-3 text-sm text-muted-foreground">{truncate ? `${truncate.texto} No se puede deshacer.` : ''}</div>
      <button
        type="button"
        className="btn btn-danger btn-sm"
        disabled={!truncate}
        onClick={() => truncate && openModal('Borrar todos los datos', <TruncateConfirm truncate={truncate} />)}
      >
        Borrar todos los datos
      </button>
    </Panel>
  )
}
