import { useState } from 'react'
import { MoneyInput } from '../../../controls/MoneyInput'
import { previewValorInversion } from '../../../lib/api'
import { cop, nowStr, parseMoney, pct, signStr } from '../../../lib/format'
import { useModal } from '@/shell/providers/ModalProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import type { InvIn, Inversion } from '../../../types'
import { FechaField } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { useEditarInversion } from './openInvForm'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { usePreview } from './usePreview'

export function ValorForm({ inv }: { inv: Inversion }) {
  const { setModalStatus } = useModal()
  const { crudOp } = useMutations()
  const guardar = useGuardar()
  const editar = useEditarInversion(inv)
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(nowStr())
  const nuevo = parseMoney(valor)

  const cambio = usePreview(nuevo > 0 ? `v:${nuevo}` : null, () => previewValorInversion(inv._id, nuevo))
  const delta = cambio?.delta ?? 0
  const totalGain = cambio?.total ?? 0
  const totalGainPct = cambio?.total_pct ?? 0
  const deltaColor = delta >= 0 ? 'text-inversiones-text' : 'text-deudas'
  const gainColor = totalGain >= 0 ? 'text-inversiones-text' : 'text-deudas'

  const save = async () => {
    if (!nuevo || nuevo <= 0) {
      setModalStatus('err', 'Valor inválido')
      return
    }
    const body: InvIn = {
      nombre: inv.nombre,
      tipo: inv.tipo,
      monto_invertido: inv.monto_invertido,
      valor_actual: nuevo,
      tasa_ea: inv.tasa_ea,
      fecha_inicio: inv.fecha_inicio,
      pago: inv.pago,
      dia_pago: inv.dia_pago,
      valor_actualizado_en: fecha,
    }
    await guardar(() => crudOp('inv', 'update', { ...body, _id: inv._id }))
  }

  return (
    <>
      <div className="modal-panel">
        <div className="modal-panel-col">
          <div className="modal-panel-label">Último valor</div>
          <div className="modal-panel-value">{cop(inv.valor_actual)}</div>
        </div>
        <div className="modal-panel-col right">
          <div className="modal-panel-label">Invertido</div>
          <div className="text-lg font-semibold">{cop(inv.monto_invertido)}</div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-nuevo-valor">
          Nuevo valor total (COP)
        </label>
        <MoneyInput id="m-nuevo-valor" value={valor} onChange={setValor} />
      </div>
      <div id="inv-value-preview" className="mb-4 overflow-hidden rounded-lg border" style={{ display: nuevo ? 'block' : 'none' }}>
        <div className="flex items-center justify-between border-b px-3.5 py-2.5">
          <span className="text-sm text-muted-foreground">Cambio desde último</span>
          <span className="text-[15px] font-semibold" id="inv-delta">
            {cambio ? (
              <span className={deltaColor}>
                {signStr(delta)}
                {cop(Math.abs(delta))}
              </span>
            ) : (
              '—'
            )}
          </span>
        </div>
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <span className="text-sm text-muted-foreground">Ganancia total vs invertido</span>
          <span className="text-[15px] font-semibold" id="inv-total-gain">
            {cambio ? (
              <span className={gainColor}>
                {signStr(totalGain)}
                {cop(Math.abs(totalGain))}{' '}
                <span className="text-xs font-medium">
                  ({signStr(totalGainPct)}
                  {pct(Math.abs(totalGainPct))}%)
                </span>
              </span>
            ) : (
              '—'
            )}
          </span>
        </div>
      </div>
      <FechaField id="m-fecha" label="Fecha de valoración" value={fecha} onChange={setFecha} />
      <FormFooter saveLabel="Actualizar" onSave={() => void save()} onEdit={editar} editLabel="Editar inversión" />
    </>
  )
}
