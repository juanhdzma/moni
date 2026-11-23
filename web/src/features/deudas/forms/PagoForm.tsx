import { useState } from 'react'
import { Breakdown, BreakdownRow } from '../../../controls/Breakdown'
import { FechaNotas, RegistrarToggle } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { ModalPanel } from '../../../controls/ModalPanel'
import { MoneyField } from '../../../controls/MoneyField'
import { previewPago } from '../../../lib/api'
import { cop, numToInput, parseMoney } from '../../../lib/format'
import { useModal } from '@/shell/providers/ModalProvider'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { useMutations } from '@/shell/hooks/useMutations'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { usePreview } from '@/shell/hooks/usePreview'
import type { Deuda, DeudaPago } from '../../../types'
import { openDeudaFormById } from './openers'

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
  const saldoNuevoN = parseMoney(saldoNuevo)
  const showBreakdown = Boolean(total) && saldoNuevo.trim() !== ''
  const preview = usePreview(showBreakdown ? `${total}:${saldoNuevoN}` : null, () =>
    previewPago(d.id, { total_pagado: total, nuevo_saldo: saldoNuevoN }),
  )

  const save = async () => {
    if (!saldoNuevo.trim()) {
      setModalStatus('err', 'Ingresá el saldo capital después del pago')
      return
    }
    await guardar(async () => {
      const body: DeudaPago = {
        nuevo_saldo: saldoNuevoN,
        total_pagado: total,
        fecha: fecha || undefined,
        notas: notas.trim(),
        registrar_tx: registrarTx,
        avanzar_cuota: !liquidar,
      }
      await apiAction(`/api/deuda/${d.id}/pago`, body)
    })
  }

  return (
    <>
      <ModalPanel
        izquierda={{ label: 'Saldo pendiente', valor: cop(d.saldo_actual), clase: 'text-deudas' }}
        derecha={{ label: 'Cuota mensual', valor: cop(d.cuota_mensual) }}
      />
      <MoneyField id="m-monto" label="Monto total pagado (COP)" value={monto} onChange={setMonto} hint={hint} />
      <MoneyField id="m-saldo-nuevo" label="Saldo capital después del pago" value={saldoNuevo} onChange={setSaldoNuevo} placeholder="Lo que muestra tu banco después" />
      <Breakdown id="pay-breakdown" visible={showBreakdown}>
        <BreakdownRow id="pay-capital" label="A capital">
          <span className="text-cartera">{preview ? cop(preview.capital) : '—'}</span>
        </BreakdownRow>
        <BreakdownRow id="pay-intereses" label="A intereses">
          <span className="text-deudas">{preview ? cop(preview.intereses) : '—'}</span>
        </BreakdownRow>
      </Breakdown>
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
          openDeudaFormById(ctx, d.id)
        }}
        editLabel="Editar deuda"
      />
    </>
  )
}
