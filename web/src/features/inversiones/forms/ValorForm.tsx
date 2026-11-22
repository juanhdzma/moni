import { useState } from 'react'
import { Breakdown, BreakdownRow } from '../../../controls/Breakdown'
import { ModalPanel } from '../../../controls/ModalPanel'
import { MoneyInput } from '../../../controls/MoneyInput'
import { Variacion } from '../../../controls/Variacion'
import { previewValorInversion } from '../../../lib/api'
import { cop, parseMoney } from '../../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import type { InvIn, Inversion } from '../../../types'
import { FechaField } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { useEditarInversion } from './openInvForm'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { usePreview } from '@/shell/hooks/usePreview'

export function ValorForm({ inv }: { inv: Inversion }) {
  const { estado } = useData()
  const { crudOp } = useMutations()
  const guardar = useGuardar()
  const editar = useEditarInversion(inv)
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(estado.hoy)
  const nuevo = parseMoney(valor)

  const cambio = usePreview(nuevo > 0 ? `v:${nuevo}` : null, () => previewValorInversion(inv.id, nuevo))

  const save = async () => {
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
    await guardar(() => crudOp('inv', 'update', { ...body, id: inv.id }))
  }

  return (
    <>
      <ModalPanel izquierda={{ label: 'Último valor', valor: cop(inv.valor_actual) }} derecha={{ label: 'Invertido', valor: cop(inv.monto_invertido) }} />
      <div className="form-group">
        <label className="form-label" htmlFor="m-nuevo-valor">
          Nuevo valor total (COP)
        </label>
        <MoneyInput id="m-nuevo-valor" value={valor} onChange={setValor} />
      </div>
      <Breakdown id="inv-value-preview" visible={nuevo > 0}>
        <BreakdownRow id="inv-delta" label="Cambio desde último">
          {cambio ? <Variacion valor={cambio.delta} /> : '—'}
        </BreakdownRow>
        <BreakdownRow id="inv-total-gain" label="Ganancia total vs invertido">
          {cambio ? <Variacion valor={cambio.total} porcentaje={cambio.total_pct} /> : '—'}
        </BreakdownRow>
      </Breakdown>
      <FechaField id="m-fecha" type="date" label="Fecha de valoración" value={fecha} onChange={setFecha} />
      <FormFooter saveLabel="Actualizar" onSave={() => void save()} onEdit={editar} editLabel="Editar inversión" />
    </>
  )
}
