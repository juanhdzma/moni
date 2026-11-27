import { useState } from 'react'
import { FormValor } from '@/controls/forms/FormValor'
import { previewValorInversion, valorarInversion } from '@/lib/api'
import { parseMoney } from '@/lib/format'
import { useGuardar } from '@/shell/hooks/acciones/useGuardar'
import { useEtiquetaMoneda } from '@/shell/hooks/datos/useMonedaCodigo'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { useMutations } from '@/shell/hooks/acciones/useMutations'
import { usePreview } from '@/shell/hooks/datos/usePreview'
import type { InvValor, Inversion } from '@/types'
import { useEditarInversion } from './openers'

export function ValorForm({ inv }: { inv: Inversion }) {
  const { cop } = useMoneda()
  const { accion } = useMutations()
  const guardar = useGuardar()
  const conMoneda = useEtiquetaMoneda()
  const editar = useEditarInversion(inv)
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState('')
  const nuevo = parseMoney(valor)

  const cambio = usePreview(`v:${nuevo}`, () => previewValorInversion(inv.id, nuevo))

  const save = async () => {
    const body: InvValor = { nuevo_valor: nuevo, ...(fecha && { fecha }) }
    await guardar(() => accion((o) => valorarInversion(inv.id, body, o)))
  }

  return (
    <FormValor
      panel={{ izquierda: { label: 'Último valor', valor: cop(inv.valor_actual) }, derecha: { label: 'Invertido', valor: cop(inv.monto_invertido) } }}
      label={conMoneda('Nuevo valor total')}
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
