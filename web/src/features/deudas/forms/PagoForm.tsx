import { useState } from 'react'
import { RegistrarToggle } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { MoneyInput } from '../../../controls/MoneyInput'
import { previewPago } from '../../../lib/api'
import { cop, numToInput, parseMoney } from '../../../lib/format'
import { useModal } from '@/shell/providers/ModalProvider'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { useMutations } from '@/shell/hooks/useMutations'
import type { Deuda, DeudaPago, PreviewPago } from '../../../types'
import { FechaNotas } from './FechaNotas'
import { openDeudaFormById } from './openers'
import { usePreview } from './usePreview'
import { useGuardar } from '@/shell/hooks/useGuardar'

export function PagoForm({ d, liquidar }: { d: Deuda; liquidar: boolean }) {
  const ctx = useOpenerCtx()
  const { closeModal, setModalStatus } = useModal()
  const guardar = useGuardar()
  const { apiAction } = useMutations()
  const [monto, setMonto] = useState(liquidar ? numToInput(d.saldo_actual) : numToInput(d.cuota_mensual))
  const [saldoNuevo, setSaldoNuevo] = useState(liquidar ? '0' : '')
  const [fecha, setFecha] = useState('')
  const [notas, setNotas] = useState('')
  const [registrarTx, setRegistrarTx] = useState(true)
  const hint = liquidar
    ? 'Ajustá si el banco cobra intereses adicionales al cancelar.'
    : 'Pre-llenado con la cuota mensual — ajustá si aplica.'

  const total = parseMoney(monto)
  const showBreakdown = Boolean(total) && saldoNuevo.trim() !== ''
  const saldoNuevoN = parseMoney(saldoNuevo)
  const preview = usePreview<PreviewPago>(showBreakdown, `${total}:${saldoNuevoN}`, () =>
    previewPago(d._id, { total_pagado: total, nuevo_saldo: saldoNuevoN }),
  )

  const save = async () => {
    const saldoNuevoV = parseMoney(saldoNuevo)
    if (!monto.trim()) {
      setModalStatus('err', 'Ingresá el monto total pagado')
      return
    }
    if (!saldoNuevo.trim()) {
      setModalStatus('err', 'Ingresá el saldo capital después del pago')
      return
    }
    await guardar(async () => {
      const body: DeudaPago = {
        nuevo_saldo: saldoNuevoV,
        total_pagado: total,
        fecha: fecha || undefined,
        notas: notas.trim(),
        registrar_tx: registrarTx,
        avanzar_cuota: !liquidar,
      }
      await apiAction(`/api/deuda/${d._id}/pago`, body)
    })
  }

  return (
    <>
      <div className="modal-panel">
        <div className="modal-panel-col">
          <div className="modal-panel-label">Saldo pendiente</div>
          <div className="modal-panel-value text-deudas">{cop(d.saldo_actual)}</div>
        </div>
        <div className="modal-panel-col right">
          <div className="modal-panel-label">Cuota mensual</div>
          <div className="text-base font-semibold">{cop(d.cuota_mensual)}</div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-monto">Monto total pagado (COP)</label>
        <MoneyInput id="m-monto" value={monto} onChange={setMonto} />
        <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-saldo-nuevo">Saldo capital después del pago</label>
        <MoneyInput id="m-saldo-nuevo" value={saldoNuevo} onChange={setSaldoNuevo} placeholder="Lo que muestra tu banco después" />
      </div>
      <div id="pay-breakdown" className="breakdown" style={{ display: showBreakdown ? 'block' : 'none' }}>
        <div className="breakdown-row">
          <span className="breakdown-label">A capital</span>
          <span className="breakdown-value text-cartera" id="pay-capital">
            {preview ? cop(preview.capital) : '—'}
          </span>
        </div>
        <div className="breakdown-row">
          <span className="breakdown-label">A intereses</span>
          <span className="breakdown-value text-deudas" id="pay-intereses">
            {preview ? cop(preview.intereses) : '—'}
          </span>
        </div>
      </div>
      <FechaNotas
        fechaLabel="Fecha del pago (ahora si se omite)"
        fecha={fecha}
        onFecha={setFecha}
        notas={notas}
        onNotas={setNotas}
        notasPlaceholder={liquidar ? 'Abonar a la deuda' : 'Ej. Cuota #14'}
      />
      <RegistrarToggle checked={registrarTx} onChange={setRegistrarTx} />
      <FormFooter
        saveLabel={liquidar ? 'Abonar' : 'Registrar pago'}
        onSave={() => void save()}
        onEdit={() => {
          closeModal()
          openDeudaFormById(ctx, d._id)
        }}
        editLabel="Editar deuda"
      />
    </>
  )
}
