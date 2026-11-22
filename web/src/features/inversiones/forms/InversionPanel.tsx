import { cop } from '../../../lib/format'
import type { Inversion } from '../../../types'

export function InversionPanel({ inv }: { inv: Inversion }) {
  return (
    <div className="modal-panel">
      <div className="modal-panel-col">
        <div className="modal-panel-label">Valor actual</div>
        <div className="modal-panel-value text-inversiones-text">{cop(inv.valor_actual)}</div>
      </div>
      <div className="modal-panel-col right">
        <div className="modal-panel-label">Invertido</div>
        <div className="modal-panel-value">{cop(inv.monto_invertido)}</div>
      </div>
    </div>
  )
}
