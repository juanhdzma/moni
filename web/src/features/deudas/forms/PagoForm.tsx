import { useState } from 'react'
import { Breakdown, BreakdownRow } from '@/controls/desglose/Breakdown'
import { MovimientoCampos } from '@/controls/forms/FormFields'
import { FormFooter } from '@/controls/forms/FormFooter'
import { ModalPanel } from '@/controls/forms/ModalPanel'
import { MoneyField } from '@/controls/inputs/MoneyField'
import { pagarDeuda, previewPago } from '@/lib/api'
import { entero, parseMoney } from '@/lib/format'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { useEtiquetaMoneda } from '@/shell/hooks/datos/useMonedaCodigo'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { useCerrarYAbrir } from '@/shell/hooks/acciones/openers'
import { useCamposMovimiento } from '@/shell/hooks/formulario/useCamposMovimiento'
import { useMutations } from '@/shell/hooks/acciones/useMutations'
import { useGuardar } from '@/shell/hooks/acciones/useGuardar'
import { usePreview } from '@/shell/hooks/datos/usePreview'
import type { Deuda, DeudaPago, ModoPago } from '@/types'
import { openDeudaFormById } from './openers'
import { FormModal } from '@/controls/forms/FormModal'

export function PagoForm({ d, modo }: { d: Deuda; modo: ModoPago }) {
  const { cop } = useMoneda()
  const editar = useCerrarYAbrir((ctx) => openDeudaFormById(ctx, d.id))
  const guardar = useGuardar()
  const { accion } = useMutations()
  const meta = useMeta()
  const infoModo = meta?.modos_pago.find((m) => m.value === modo)
  const t = meta?.textos.pago
  const conMoneda = useEtiquetaMoneda()
  const sugerido = d.pago[modo]
  const [monto, setMonto] = useState(sugerido.monto === null ? '' : entero(sugerido.monto))
  const [saldoNuevo, setSaldoNuevo] = useState(sugerido.nuevo_saldo === null ? '' : entero(sugerido.nuevo_saldo))
  const campos = useCamposMovimiento()

  const total = parseMoney(monto)
  const saldoNuevoN = parseMoney(saldoNuevo)
  const saldoEscrito = saldoNuevo.trim() !== ''
  const preview = usePreview(`${total}:${saldoEscrito ? saldoNuevoN : ''}`, () =>
    previewPago(d.id, { total_pagado: total, ...(saldoEscrito && { nuevo_saldo: saldoNuevoN }), modo }),
  )

  const save = async () => {
    await guardar(async () => {
      const body: DeudaPago = {
        ...(saldoEscrito && { nuevo_saldo: saldoNuevoN }),
        total_pagado: total,
        ...campos.cuerpo(),
        modo,
      }
      await accion((o) => pagarDeuda(d.id, body, o))
    })
  }

  return (
    <FormModal>
      <ModalPanel
        izquierda={{ label: t?.label_saldo_pendiente ?? '', valor: cop(d.saldo_actual), clase: 'text-deudas' }}
        derecha={{ label: t?.label_cuota_mensual ?? '', valor: cop(d.cuota_mensual) }}
      />
      <MoneyField id="m-monto" label={conMoneda(t?.label_monto)} value={monto} onChange={setMonto} hint={sugerido.hint} />
      <MoneyField id="m-saldo-nuevo" label={t?.label_saldo_nuevo ?? ''} value={saldoNuevo} onChange={setSaldoNuevo} placeholder={t?.placeholder_saldo_nuevo} />
      <Breakdown id="pay-breakdown" visible={preview !== null}>
        <BreakdownRow id="pay-capital" label={t?.label_capital ?? ''}>
          <span className="text-cartera">{preview ? cop(preview.capital) : '—'}</span>
        </BreakdownRow>
        <BreakdownRow id="pay-intereses" label={t?.label_intereses ?? ''}>
          <span className="text-deudas">{preview ? cop(preview.intereses) : '—'}</span>
        </BreakdownRow>
      </Breakdown>
      <MovimientoCampos
        campos={campos}
        fechaLabel={t?.label_fecha ?? ''}
        notasPlaceholder={infoModo?.placeholder_notas ?? ''}
      />
      <FormFooter
        saveLabel={infoModo?.label ?? ''}
        onSave={() => void save()}
        onEdit={editar}
        editLabel={t?.label_editar}
      />
    </FormModal>
  )
}
