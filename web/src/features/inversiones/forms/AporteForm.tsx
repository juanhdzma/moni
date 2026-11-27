import { useState } from 'react'
import { MoneyField } from '@/controls/inputs/MoneyField'
import { aportarInversion, previewAporte } from '@/lib/api'
import { entero, parseMoney } from '@/lib/format'
import { useCamposMovimiento } from '@/shell/hooks/formulario/useCamposMovimiento'
import { useEtiquetaMoneda } from '@/shell/hooks/datos/useMonedaCodigo'
import { useMutations } from '@/shell/hooks/acciones/useMutations'
import type { InvAporte, Inversion } from '@/types'
import { MovimientoCampos } from '@/controls/forms/FormFields'
import { FormFooter } from '@/controls/forms/FormFooter'
import { InversionPanel } from './InversionPanel'
import { useGuardar } from '@/shell/hooks/acciones/useGuardar'
import { usePreview } from '@/shell/hooks/datos/usePreview'
import { FormModal } from '@/controls/forms/FormModal'

export function AporteForm({ inv }: { inv: Inversion }) {
  const { accion } = useMutations()
  const guardar = useGuardar()
  const conMoneda = useEtiquetaMoneda()
  const [monto, setMonto] = useState('')
  const [nuevoValor, setNuevoValor] = useState('')
  const campos = useCamposMovimiento()

  const aporteVal = parseMoney(monto)
  const estimado = usePreview(`a:${aporteVal}`, () => previewAporte(inv.id, aporteVal))

  const save = async () => {
    const body: InvAporte = {
      monto: parseMoney(monto),
      ...(nuevoValor ? { nuevo_valor: parseMoney(nuevoValor) } : {}),
      ...campos.cuerpo(),
    }
    await guardar(() => accion((o) => aportarInversion(inv.id, body, o)))
  }

  return (
    <FormModal>
      <InversionPanel inv={inv} />
      <MoneyField id="m-monto" label={conMoneda('Monto que agregás')} value={monto} onChange={setMonto} />
      <MoneyField
        id="m-nuevo-valor"
        label="Nuevo valor del fondo después del aporte"
        value={nuevoValor}
        onChange={setNuevoValor}
        placeholder={entero(estimado?.nuevo_valor_estimado ?? inv.valor_actual)}
        hint={estimado?.texto_estimado}
        hintId="add-more-hint"
      />
      <MovimientoCampos campos={campos} fechaType="date" fechaLabel="Fecha (hoy si se omite)" notasPlaceholder="Ej. Aporte mensual" />
      <FormFooter saveLabel="Agregar aporte" onSave={() => void save()} />
    </FormModal>
  )
}
