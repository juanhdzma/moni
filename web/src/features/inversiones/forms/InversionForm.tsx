import { useState } from 'react'
import { AdvancedToggle } from '../../../controls/AdvancedToggle'
import { DatePicker } from '../../../controls/DatePicker'
import { MoneyField } from '../../../controls/MoneyField'
import { NombreField } from '../../../controls/NombreField'
import { TipoToggle } from '../../../controls/TipoToggle'
import { cargarTasa } from '../../../lib/api'
import { useData } from '@/shell/providers/DataProvider'
import { numToInput, parseMoney, soloFecha } from '../../../lib/format'
import { useConfirmDelete } from '@/shell/hooks/useConfirmDelete'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { useMeta } from '@/shell/hooks/useMeta'
import { useMutations } from '@/shell/hooks/useMutations'
import { usePreview } from '@/shell/hooks/usePreview'
import type { InvIn, Inversion, PagoInv, TipoInv } from '../../../types'
import { FormFooter } from '../../../controls/FormFooter'
import { hintClass, rateBtn } from './styles'

const TONOS_TIPO = { fija: 'ingreso', variable: 'gasto' } as const
const TONOS_PAGO = { mensual: 'ingreso' } as const

export function InversionForm({ inv }: { inv: Inversion | null }) {
  const { estado } = useData()
  const { crudOp } = useMutations()
  const meta = useMeta()
  const eliminar = useConfirmDelete('inv', inv, `¿Eliminar "${inv?.nombre}"?`)
  const guardar = useGuardar()
  const isEdit = inv !== null
  const [nombre, setNombre] = useState(inv?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoInv>(inv?.tipo || 'fija')
  const [invertido, setInvertido] = useState(inv ? numToInput(inv.monto_invertido) : '')
  const [actual, setActual] = useState(inv ? numToInput(inv.valor_actual) : '')
  const [tasa, setTasa] = useState(inv?.tasa_ea ? String(inv.tasa_ea) : '')
  const [rateType, setRateType] = useState<'ea' | 'mv'>('ea')
  const [pago, setPago] = useState<PagoInv>(inv?.pago || 'vencimiento')
  const [diaPago, setDiaPago] = useState(inv?.dia_pago ? String(inv.dia_pago) : '')
  const [fecha, setFecha] = useState(soloFecha(inv?.fecha_inicio) || estado.hoy)
  const [esNueva, setEsNueva] = useState(true)

  const tasaVal = parseFloat(tasa) || 0
  const conv = usePreview(tasaVal > 0 ? `${rateType}:${tasaVal}` : null, () => cargarTasa(tasaVal, rateType))
  const equiv = conv?.texto ?? ''

  const save = async () => {
    const valorIngresado = parseMoney(actual)
    const tasa_ea = parseFloat(tasa) || null

    const data: InvIn = {
      nombre: nombre.trim(),
      tipo,
      monto_invertido: parseMoney(invertido),
      ...(valorIngresado ? { valor_actual: valorIngresado } : {}),
      tasa_ea,
      fecha_inicio: fecha,
      pago,
      dia_pago: parseInt(diaPago) || null,
      ...(tasa_ea !== null ? { tasa_tipo: rateType } : {}),
    }

    await guardar(() => (inv ? crudOp('inv', 'update', { ...data, id: inv.id }) : crudOp('inv', 'add', { ...data, crear_tx: esNueva })))
  }

  return (
    <>
      <NombreField value={nombre} onChange={setNombre} placeholder="Ej. CDT Bancolombia" />
      {isEdit ? (
        <div className="form-group">
          <div className="form-label">Tipo</div>
          <div className="rounded-md border bg-muted px-3 py-2 text-[15px] font-medium text-muted-foreground">
            {meta?.tipos_inversion.find((t) => t.value === tipo)?.label ?? ''}
          </div>
        </div>
      ) : (
        <TipoToggle value={tipo} opciones={meta?.tipos_inversion ?? []} tonos={TONOS_TIPO} onChange={setTipo} />
      )}
      <div className="form-row-2">
        <MoneyField id="m-invertido" label="Monto invertido" value={invertido} onChange={setInvertido} />
        <MoneyField id="m-actual" label="Valor actual" value={actual} onChange={setActual} />
      </div>
      {tipo === 'fija' && (
        <div id="m-tasa-wrap" className="form-group">
          <label className="form-label" htmlFor="m-tasa">
            Tasa de rendimiento
          </label>
          <div className="flex items-center gap-2">
            <input
              className="form-input flex-1"
              type="number"
              step="0.0001"
              id="m-tasa"
              value={tasa}
              placeholder="0"
              onChange={(e) => setTasa(e.target.value)}
            />
            <div className="flex shrink-0 overflow-hidden rounded-md border">
              <button type="button" className={rateBtn(rateType === 'ea')} data-rate="ea" aria-pressed={rateType === 'ea'} onClick={() => setRateType('ea')}>
                EA
              </button>
              <button type="button" className={rateBtn(rateType === 'mv')} data-rate="mv" aria-pressed={rateType === 'mv'} onClick={() => setRateType('mv')}>
                MV
              </button>
            </div>
          </div>
          <div id="tasa-equiv" className={hintClass}>
            {equiv}
          </div>
        </div>
      )}
      {tipo === 'fija' && (
        <div id="m-pago-wrap">
          <TipoToggle
            label="Pago de rendimientos"
            value={pago}
            opciones={meta?.pagos_inversion ?? []}
            tonos={TONOS_PAGO}
            idPrefix="rp"
            onChange={setPago}
          />
        </div>
      )}
      {tipo === 'fija' && pago === 'mensual' && (
        <div id="m-dia-pago-wrap" className="form-group">
          <label className="form-label" htmlFor="m-dia-pago">
            Día del mes que paga
          </label>
          <input
            className="form-input"
            type="number"
            id="m-dia-pago"
            min="1"
            max="31"
            value={diaPago}
            placeholder="Ej. 15"
            onChange={(e) => setDiaPago(e.target.value)}
          />
        </div>
      )}
      <div className="form-group">
        <label className="form-label" htmlFor="m-fecha-ini">
          Fecha inicio
        </label>
        <DatePicker id="m-fecha-ini" value={fecha} onChange={setFecha} />
      </div>
      {!isEdit && <AdvancedToggle checked={esNueva} onChange={setEsNueva} />}
      <FormFooter saveLabel={isEdit ? 'Guardar cambios' : 'Agregar inversión'} onSave={() => void save()} onDelete={eliminar} />
    </>
  )
}
