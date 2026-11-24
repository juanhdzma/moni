import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Panel } from '@/components/panel'
import { FormStatus } from '../../controls/FormStatus'
import { apiFetch } from '../../lib/api'
import { errMsg } from '../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useModal } from '@/shell/providers/ModalProvider'

function TruncateConfirm() {
  const { closeModal, setModalStatus } = useModal()
  const { reload } = useData()
  const [val, setVal] = useState('')

  const confirmar = async () => {
    if (val.trim() !== 'BORRAR') {
      setModalStatus('err', 'Escribí BORRAR (en mayúsculas) para confirmar')
      return
    }
    setModalStatus('', 'Borrando...')
    try {
      await apiFetch('/api/truncate', { method: 'POST' })
      closeModal()
      await reload()
    } catch (err) {
      setModalStatus('err', errMsg(err))
    }
  }

  return (
    <>
      <div className="mb-4 text-sm text-muted-foreground">
        Esto borra permanentemente todas las transacciones, deudas, inversiones, activos, recurrentes, categorías personalizadas y operaciones ocultas.
        Esta acción no se puede deshacer. Exportá un backup antes si no estás seguro.
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-confirm-truncate">Escribí BORRAR para confirmar</label>
        <input
          className="form-input"
          type="text"
          id="m-confirm-truncate"
          placeholder="BORRAR"
          autoComplete="off"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
      </div>
      <div className="modal-footer">
        <button className="btn btn-danger" onClick={() => void confirmar()}>
          Borrar todo
        </button>
        <button className="btn btn-dim" onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}

export function Peligro() {
  const { openModal } = useModal()

  return (
    <Panel
      id="settings-danger-card"
      titulo="Zona de peligro"
      className="border-deudas/40"
      extra={<TriangleAlert className="size-4 text-deudas" aria-hidden="true" />}
    >
      <div className="mb-3 text-sm text-muted-foreground">
        Borra todas las transacciones, deudas, inversiones, activos, recurrentes, categorías personalizadas y operaciones ocultas. No se puede deshacer.
      </div>
      <button type="button" className="btn btn-danger btn-sm" onClick={() => openModal('Borrar todos los datos', <TruncateConfirm />)}>
        Borrar todos los datos
      </button>
    </Panel>
  )
}
