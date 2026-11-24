import { useState } from 'react'
import { Breakdown, BreakdownRow } from '../../../controls/Breakdown'
import { MovimientoCampos } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { ModalPanel } from '../../../controls/ModalPanel'
import { MoneyField } from '../../../controls/MoneyField'
import { previewPago } from '../../../lib/api'
import { entero, parseMoney } from '../../../lib/format'
import { useMoneda } from '@/shell/hooks/useMoneda'
import { useCerrarYAbrir } from '@/shell/hooks/openers'
import { useCamposMovimiento } from '@/shell/hooks/useCamposMovimiento'
import { useMutations } from '@/shell/hooks/useMutations'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { usePreview } from '@/shell/hooks/usePreview'
import type { Deuda, DeudaPago, ModoPago } from '../../../types'
import { openDeudaFormById } from './openers'

export const ETIQUETA_PAGO: Record<ModoPago, string> = { cuota: 'Pagar cuota', abono: 'Abonar', liquidar: 'Liquidar' }

const NOTAS_PAGO: Record<ModoPago, string> = { cuota: 'Ej. Cuota #14', abono: 'Ej. Abono extraordinario', liquidar: 'Liquidar la deuda' }

export function PagoForm({ d, modo }: { d: Deuda; modo: ModoPago }) {
  const { cop } = useMoneda()
  const editar = useCerrarYAbrir((ctx) => openDeudaFormById(ctx, d.id))
  const guardar = useGuardar()
  const { apiAction } = useMutations()
  const sugerido = d.pago[modo]
  const [monto, setMonto] = useState(sugerido.monto === null ? '' : entero(sugerido.monto))
  const [saldoNuevo, setSaldoNuevo] = useState(sugerido.nuevo_saldo === null ? '' : entero(sugerido.nuevo_saldo))
  const campos = useCamposMovimiento('')

  const total = parseMoney(monto)
  const saldoNuevoN = parseMoney(saldoNuevo)
  const showBreakdown = Boolean(total) && saldoNuevo.trim() !== ''
  const preview = usePreview(showBreakdown ? `${total}:${saldoNuevoN}` : null, () =>
    previewPago(d.id, { total_pagado: total, nuevo_saldo: saldoNuevoN, modo }),
  )

  const save = async () => {
    await guardar(async () => {
      const body: Omit<DeudaPago, 'nuevo_saldo'> & Partial<Pick<DeudaPago, 'nuevo_saldo'>> = {
        ...(saldoNuevo.trim() && { nuevo_saldo: saldoNuevoN }),
        total_pagado: total,
        ...campos.cuerpo(),
        modo,
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
      <MoneyField id="m-monto" label="Monto total pagado (COP)" value={monto} onChange={setMonto} hint={sugerido.hint} />
      <MoneyField id="m-saldo-nuevo" label="Saldo capital después del pago" value={saldoNuevo} onChange={setSaldoNuevo} placeholder="Lo que muestra tu banco después" />
      <Breakdown id="pay-breakdown" visible={showBreakdown}>
        <BreakdownRow id="pay-capital" label="A capital">
          <span className="text-cartera">{preview ? cop(preview.capital) : '—'}</span>
        </BreakdownRow>
        <BreakdownRow id="pay-intereses" label="A intereses">
          <span className="text-deudas">{preview ? cop(preview.intereses) : '—'}</span>
        </BreakdownRow>
      </Breakdown>
      <MovimientoCampos
        campos={campos}
        fechaLabel="Fecha del pago (ahora si se omite)"
        notasPlaceholder={NOTAS_PAGO[modo]}
      />
      <FormFooter
        saveLabel={ETIQUETA_PAGO[modo]}
        onSave={() => void save()}
        onEdit={editar}
        editLabel="Editar deuda"
      />
    </>
  )
}
