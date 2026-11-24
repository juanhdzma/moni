import { useState } from 'react'
import { BreakdownVariacion } from '../../../controls/BreakdownVariacion'
import { ModalPanel } from '../../../controls/ModalPanel'
import { MoneyField } from '../../../controls/MoneyField'
import { previewValorInversion } from '../../../lib/api'
import { cop, parseMoney } from '../../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import type { InvValor, Inversion } from '../../../types'
import { FechaField } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { useEditarInversion } from './openers'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { usePreview } from '@/shell/hooks/usePreview'

export function ValorForm({ inv }: { inv: Inversion }) {
  const { estado } = useData()
  const { apiAction } = useMutations()
  const guardar = useGuardar()
  const editar = useEditarInversion(inv)
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(estado.hoy)
  const nuevo = parseMoney(valor)

  const cambio = usePreview(nuevo > 0 ? `v:${nuevo}` : null, () => previewValorInversion(inv.id, nuevo))

  const save = async () => {
    const body: InvValor = { nuevo_valor: nuevo, fecha }
    await guardar(() => apiAction(`/api/inv/${inv.id}/valor`, body))
  }

  return (
    <>
      <ModalPanel izquierda={{ label: 'Último valor', valor: cop(inv.valor_actual) }} derecha={{ label: 'Invertido', valor: cop(inv.monto_invertido) }} />
      <MoneyField id="m-nuevo-valor" label="Nuevo valor total (COP)" value={valor} onChange={setValor} />
      <BreakdownVariacion
        id="inv-value-preview"
        idDelta="inv-delta"
        idTotal="inv-total-gain"
        labelTotal="Ganancia total vs invertido"
        visible={nuevo > 0}
        preview={cambio}
      />
      <FechaField id="m-fecha" type="date" label="Fecha de valoración" value={fecha} onChange={setFecha} />
      <FormFooter saveLabel="Actualizar" onSave={() => void save()} onEdit={editar} editLabel="Editar inversión" />
    </>
  )
}
