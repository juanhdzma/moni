import { useState } from 'react'
import { BreakdownVariacion } from '../../../controls/BreakdownVariacion'
import { FechaField } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { ModalPanel } from '../../../controls/ModalPanel'
import { MoneyField } from '../../../controls/MoneyField'
import { Variacion } from '../../../controls/Variacion'
import { previewValorActivo } from '../../../lib/api'
import { parseMoney } from '../../../lib/format'
import { useMoneda } from '@/shell/hooks/useMoneda'
import { useCerrarYAbrir } from '@/shell/hooks/openers'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { useMutations } from '@/shell/hooks/useMutations'
import { usePreview } from '@/shell/hooks/usePreview'
import type { Activo, ActivoValor } from '../../../types'
import { openActivoForm } from './openers'

export function ActivoValorForm({ activo: a }: { activo: Activo }) {
  const { cop } = useMoneda()
  const editar = useCerrarYAbrir((ctx) => openActivoForm(ctx, a))
  const guardar = useGuardar()
  const { apiAction } = useMutations()
  const [nuevoTxt, setNuevoTxt] = useState('')
  const [fecha, setFecha] = useState('')
  const nuevo = parseMoney(nuevoTxt)
  const prev = usePreview(nuevo > 0 ? `activo-valor:${a.id}:${nuevo}` : null, () => previewValorActivo(a.id, nuevo))

  const save = async () => {
    await guardar(async () => {
      const body: ActivoValor = { nuevo_valor: nuevo, ...(fecha && { fecha }) }
      await apiAction(`/api/activo/${a.id}/valor`, body)
    })
  }

  return (
    <>
      <ModalPanel
        izquierda={{ label: 'Valor actual', valor: cop(a.valor_actual) }}
        derecha={{ label: 'Vs. precio inicial', valor: <Variacion valor={a.cambio} porcentaje={a.cambio_pct} /> }}
      />
      <MoneyField id="m-nuevo-valor" label="Nuevo valor (COP)" value={nuevoTxt} onChange={setNuevoTxt} />
      <BreakdownVariacion
        id="activo-update-preview"
        idDelta="activo-delta"
        idTotal="activo-total"
        labelTotal="Variación vs precio inicial"
        visible={nuevo > 0 && prev !== null}
        preview={prev}
      />
      <FechaField id="m-fecha" label="Fecha de valoración (hoy si se omite)" value={fecha} onChange={setFecha} />
      <FormFooter
        saveLabel="Actualizar"
        onSave={() => void save()}
        onEdit={editar}
        editLabel="Editar activo"
        cancelClassName="sm:ml-auto"
      />
    </>
  )
}
