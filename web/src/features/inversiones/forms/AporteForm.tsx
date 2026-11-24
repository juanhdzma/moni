import { useState } from 'react'
import { MoneyField } from '../../../controls/MoneyField'
import { previewAporte } from '../../../lib/api'
import { entero, parseMoney } from '../../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useCamposMovimiento } from '@/shell/hooks/useCamposMovimiento'
import { useMutations } from '@/shell/hooks/useMutations'
import type { InvAporte, Inversion } from '../../../types'
import { MovimientoCampos } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { InversionPanel } from './InversionPanel'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { usePreview } from '@/shell/hooks/usePreview'

export function AporteForm({ inv }: { inv: Inversion }) {
  const { estado } = useData()
  const { apiAction } = useMutations()
  const guardar = useGuardar()
  const [monto, setMonto] = useState('')
  const [nuevoValor, setNuevoValor] = useState('')
  const campos = useCamposMovimiento(estado.hoy)

  const aporteVal = parseMoney(monto)
  const estimado = usePreview(`a:${aporteVal}`, () => previewAporte(inv.id, aporteVal))

  const save = async () => {
    const body: InvAporte = {
      monto: parseMoney(monto),
      ...(nuevoValor ? { nuevo_valor: parseMoney(nuevoValor) } : {}),
      ...campos.cuerpo(),
    }
    await guardar(() => apiAction(`/api/inv/${inv.id}/aporte`, body))
  }

  return (
    <>
      <InversionPanel inv={inv} />
      <MoneyField id="m-monto" label="Monto que agregas (COP)" value={monto} onChange={setMonto} />
      <MoneyField
        id="m-nuevo-valor"
        label="Nuevo valor del fondo después del aporte"
        value={nuevoValor}
        onChange={setNuevoValor}
        placeholder={entero(estimado?.nuevo_valor_estimado ?? inv.valor_actual)}
        hint={estimado?.texto_estimado}
        hintId="add-more-hint"
      />
      <MovimientoCampos campos={campos} fechaType="date" fechaLabel="Fecha" notasPlaceholder="Ej. Aporte mensual" />
      <FormFooter saveLabel="Agregar aporte" onSave={() => void save()} />
    </>
  )
}
