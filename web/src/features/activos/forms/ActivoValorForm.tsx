import { useState } from 'react'
import { FormValor } from '@/controls/forms/FormValor'
import { Variacion } from '@/components/Monto'
import { previewValorActivo, valorarActivo } from '@/lib/api'
import { parseMoney } from '@/lib/format'
import { useCerrarYAbrir } from '@/shell/hooks/acciones/openers'
import { useGuardar } from '@/shell/hooks/acciones/useGuardar'
import { useEtiquetaMoneda } from '@/shell/hooks/datos/useMonedaCodigo'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { useMutations } from '@/shell/hooks/acciones/useMutations'
import { usePreview } from '@/shell/hooks/datos/usePreview'
import type { Activo, ActivoValor } from '@/types'
import { openActivoFormById } from './openers'

export function ActivoValorForm({ activo: a }: { activo: Activo }) {
  const { cop } = useMoneda()
  const editar = useCerrarYAbrir((ctx) => openActivoFormById(ctx, a.id))
  const guardar = useGuardar()
  const conMoneda = useEtiquetaMoneda()
  const { accion } = useMutations()
  const [nuevoTxt, setNuevoTxt] = useState('')
  const [fecha, setFecha] = useState('')
  const nuevo = parseMoney(nuevoTxt)
  const prev = usePreview(`activo-valor:${a.id}:${nuevo}`, () => previewValorActivo(a.id, nuevo))

  const save = async () => {
    await guardar(async () => {
      const body: ActivoValor = { nuevo_valor: nuevo, ...(fecha && { fecha }) }
      await accion((o) => valorarActivo(a.id, body, o))
    })
  }

  return (
    <FormValor
      panel={{ izquierda: { label: 'Valor actual', valor: cop(a.valor_actual) }, derecha: { label: 'Vs. precio inicial', valor: <Variacion valor={a.cambio} tono={a.cambio_tono} signo={a.cambio_signo} porcentaje={a.cambio_pct} /> } }}
      label={conMoneda('Nuevo valor')}
      valor={nuevoTxt}
      onValor={setNuevoTxt}
      variacion={{ id: 'activo-update-preview', idDelta: 'activo-delta', idTotal: 'activo-total', labelTotal: 'Variación vs precio inicial', visible: prev !== null, preview: prev }}
      fechaLabel="Fecha de valoración (hoy si se omite)"
      fecha={fecha}
      onFecha={setFecha}
      fechaType="datetime-local"
      footer={{ saveLabel: 'Actualizar', onSave: () => void save(), onEdit: editar, editLabel: 'Editar activo' }}
    />
  )
}
