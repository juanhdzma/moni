import { useState } from 'react'
import { MoneyInput } from '../../../controls/MoneyInput'
import { previewAporte } from '../../../lib/api'
import { numToInput, parseMoney } from '../../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useCamposMovimiento } from '@/shell/hooks/useCamposMovimiento'
import { Hint } from '../../../controls/Hint'
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
      <div className="form-group">
        <label className="form-label" htmlFor="m-monto">
          Monto que agregas (COP)
        </label>
        <MoneyInput id="m-monto" value={monto} onChange={setMonto} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-nuevo-valor">
          Nuevo valor del fondo después del aporte
        </label>
        <MoneyInput
          id="m-nuevo-valor"
          value={nuevoValor}
          onChange={setNuevoValor}
          placeholder={numToInput(estimado?.nuevo_valor_estimado ?? inv.valor_actual)}
        />
        {estimado && <Hint id="add-more-hint">{estimado.texto_estimado}</Hint>}
      </div>
      <MovimientoCampos campos={campos} fechaType="date" fechaLabel="Fecha" notasPlaceholder="Ej. Aporte mensual" />
      <FormFooter saveLabel="Agregar aporte" onSave={() => void save()} />
    </>
  )
}
