import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Panel } from '@/components/Panel'
import { Campo } from '@/controls/inputs/Campo'
import { vaciarDatos } from '@/lib/api'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { useData } from '@/shell/providers/DataProvider'
import { useModal } from '@/shell/providers/ModalProvider'
import type { Meta } from '@/types'
import { ConfirmarClave } from './ConfirmarClave'

function TruncateConfirm({ meta }: { meta: Meta }) {
  const { mutar } = useData()
  const [val, setVal] = useState('')
  const { palabra } = meta.truncate
  const t = meta.textos.peligro

  return (
    <ConfirmarClave
      peligro
      etiqueta={t.etiqueta_confirmar}
      descripcion={t.descripcion_confirmar}
      validar={() => (val.trim() === palabra ? null : t.error_palabra)}
      onConfirmar={(clave) => mutar((onAfectadas) => vaciarDatos(clave, onAfectadas))}
      extra={
        <Campo id="m-confirm-truncate" label={t.label_palabra}>
          <input
            className="form-input"
            type="text"
            id="m-confirm-truncate"
            placeholder={palabra}
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
  const meta = useMeta()
  const t = meta?.textos.peligro

  return (
    <Panel
      id="settings-danger-card"
      titulo={t?.titulo ?? ''}
      className="border-deudas/40"
      extra={<TriangleAlert className="size-4 text-deudas" aria-hidden="true" />}
    >
      <div className="mb-3 text-sm text-muted-foreground">{t?.nota}</div>
      <button
        type="button"
        className="btn btn-danger btn-sm"
        disabled={!meta}
        onClick={() => meta && openModal(meta.textos.peligro.titulo_modal, <TruncateConfirm meta={meta} />)}
      >
        {t?.boton}
      </button>
    </Panel>
  )
}
