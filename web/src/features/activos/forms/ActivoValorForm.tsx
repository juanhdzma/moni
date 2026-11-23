import { useState } from 'react'
import { Breakdown, BreakdownRow } from '../../../controls/Breakdown'
import { FechaField } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { ModalPanel } from '../../../controls/ModalPanel'
import { MoneyField } from '../../../controls/MoneyField'
import { Variacion } from '../../../controls/Variacion'
import { previewValorActivo } from '../../../lib/api'
import { cop, parseMoney } from '../../../lib/format'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { useMutations } from '@/shell/hooks/useMutations'
import { usePreview } from '@/shell/hooks/usePreview'
import { useModal } from '@/shell/providers/ModalProvider'
import type { Activo, ActivoValor } from '../../../types'
import { openActivoForm } from './openers'

export function ActivoValorForm({ activo: a }: { activo: Activo }) {
  const ctx = useOpenerCtx()
  const { closeModal } = useModal()
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
      <Breakdown id="activo-update-preview" visible={nuevo > 0 && prev !== null}>
        <BreakdownRow id="activo-delta" label="Cambio desde último">
          <Variacion valor={prev?.delta ?? 0} />
        </BreakdownRow>
        <BreakdownRow id="activo-total" label="Variación vs precio inicial">
          <Variacion valor={prev?.total ?? 0} porcentaje={prev?.total_pct ?? 0} />
        </BreakdownRow>
      </Breakdown>
      <FechaField id="m-fecha" label="Fecha de valoración (hoy si se omite)" value={fecha} onChange={setFecha} />
      <FormFooter
        saveLabel="Actualizar"
        onSave={() => void save()}
        onEdit={() => {
          closeModal()
          openActivoForm(ctx, a)
        }}
        editLabel="Editar activo"
        cancelClassName="sm:ml-auto"
      />
    </>
  )
}
