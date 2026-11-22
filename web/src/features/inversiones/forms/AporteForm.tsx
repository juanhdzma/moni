import { useState } from 'react'
import { MoneyInput } from '../../../controls/MoneyInput'
import { previewAporte } from '../../../lib/api'
import { cop, numToInput, parseMoney } from '../../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import type { InvAporte, Inversion } from '../../../types'
import { FechaField, NotasField, RegistrarToggle } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { InversionPanel } from './InversionPanel'
import { hintClass } from './styles'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { usePreview } from './usePreview'

export function AporteForm({ inv }: { inv: Inversion }) {
  const { estado } = useData()
  const { apiAction } = useMutations()
  const guardar = useGuardar()
  const [monto, setMonto] = useState('')
  const [nuevoValor, setNuevoValor] = useState('')
  const [fecha, setFecha] = useState(estado.hoy)
  const [notas, setNotas] = useState('')
  const [registrar, setRegistrar] = useState(true)

  const aporteVal = parseMoney(monto)
  const estimado = usePreview(aporteVal > 0 ? `a:${aporteVal}` : null, () => previewAporte(inv._id, aporteVal))?.nuevo_valor_estimado ?? null

  const save = async () => {
    const body: InvAporte = {
      monto: parseMoney(monto),
      ...(nuevoValor ? { nuevo_valor: parseMoney(nuevoValor) } : {}),
      fecha,
      notas: notas.trim(),
      registrar_tx: registrar,
    }
    await guardar(() => apiAction(`/api/inv/${inv._id}/aporte`, body))
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
          placeholder={numToInput(estimado ?? inv.valor_actual)}
        />
        <div className={hintClass} id="add-more-hint">
          {estimado !== null
            ? `Estimado: ${cop(estimado)}. Ajustá si el mercado se movió.`
            : 'Estimado como valor actual + aporte. Ajustá si el mercado se movió.'}
        </div>
      </div>
      <FechaField id="m-fecha" type="date" label="Fecha" value={fecha} onChange={setFecha} />
      <NotasField id="m-notas" placeholder="Ej. Aporte mensual" value={notas} onChange={setNotas} />
      <RegistrarToggle checked={registrar} onChange={setRegistrar} />
      <FormFooter saveLabel="Agregar aporte" onSave={() => void save()} />
    </>
  )
}
