import { useState } from 'react'
import { FormValor } from '@/controls/forms/FormValor'
import { previewValorInversion } from '@/lib/api'
import { parseMoney } from '@/lib/format'
import { useGuardar } from '@/shell/hooks/acciones/useGuardar'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { useMutations } from '@/shell/hooks/acciones/useMutations'
import { usePreview } from '@/shell/hooks/datos/usePreview'
import type { InvValor, Inversion } from '@/types'
import { useEditarInversion } from './openers'

export function ValorForm({ inv }: { inv: Inversion }) {
  const { cop } = useMoneda()
  const { apiAction } = useMutations()
  const guardar = useGuardar()
  const editar = useEditarInversion(inv)
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState('')
  const nuevo = parseMoney(valor)

  const cambio = usePreview(`v:${nuevo}`, () => previewValorInversion(inv.id, nuevo))

  const save = async () => {
    const body: InvValor = { nuevo_valor: nuevo, ...(fecha && { fecha }) }
    await guardar(() => apiAction(`/api/inv/${inv.id}/valor`, body))
  }

  return (
    <FormValor
      panel={{ izquierda: { label: 'Último valor', valor: cop(inv.valor_actual) }, derecha: { label: 'Invertido', valor: cop(inv.monto_invertido) } }}
      label="Nuevo valor total (COP)"
      valor={valor}
      onValor={setValor}
      variacion={{ id: 'inv-value-preview', idDelta: 'inv-delta', idTotal: 'inv-total-gain', labelTotal: 'Ganancia total vs invertido', visible: cambio !== null, preview: cambio }}
      fechaLabel="Fecha de valoración (hoy si se omite)"
      fecha={fecha}
      onFecha={setFecha}
      fechaType="date"
      footer={{ saveLabel: 'Actualizar', onSave: () => void save(), onEdit: editar, editLabel: 'Editar inversión' }}
    />
  )
}
