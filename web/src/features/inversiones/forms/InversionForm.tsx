import { useState } from 'react'
import { AdvancedToggle } from '../../../controls/AdvancedToggle'
import { DatePicker } from '../../../controls/DatePicker'
import { MoneyInput } from '../../../controls/MoneyInput'
import { cargarTasa } from '../../../lib/api'
import { numToInput, parseMoney, pct, todayStr } from '../../../lib/format'
import { useModal } from '@/shell/providers/ModalProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import type { InvIn, Inversion, PagoInv, TipoInv } from '../../../types'
import { FormFooter } from '../../../controls/FormFooter'
import { hintClass, rateBtn } from './styles'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { usePreview } from './usePreview'

export function InversionForm({ inv }: { inv: Inversion | null }) {
  const { setModalStatus } = useModal()
  const { crudOp, crudOpOrBanner } = useMutations()
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
  const [fecha, setFecha] = useState(inv?.fecha_inicio?.split('T')[0] || todayStr())
  const [esNueva, setEsNueva] = useState(true)

  const tasaVal = parseFloat(tasa) || 0
  const conv = usePreview(tasaVal > 0 ? `${rateType}:${tasaVal}` : null, () => cargarTasa(tasaVal, rateType))
  const equiv =
    !conv || !tasaVal
      ? ''
      : rateType === 'ea'
        ? conv.mv === null
          ? ''
          : `Equivale a ${pct(conv.mv, 4)}% MV`
        : conv.ea === null
          ? ''
          : `Equivale a ${pct(conv.ea, 2)}% EA`

  const save = async () => {
    const monto = parseMoney(invertido)
    const valorIngresado = parseMoney(actual)
    const tasa_ea = tipo === 'fija' ? parseFloat(tasa) || null : null
    const pagoFinal = tipo === 'fija' ? pago : null
    const dia_pago = pagoFinal === 'mensual' ? parseInt(diaPago) || null : null

    if (!nombre.trim()) {
      setModalStatus('err', 'Nombre requerido')
      return
    }
    if (!monto) {
      setModalStatus('err', 'Monto invertido requerido')
      return
    }

    const valorActual = valorIngresado || monto
    const valorActualizadoEn = !inv ? fecha : inv.valor_actual === valorActual ? inv.valor_actualizado_en : todayStr()
    const data: InvIn = {
      nombre: nombre.trim(),
      tipo,
      monto_invertido: monto,
      valor_actual: valorActual,
      tasa_ea,
      fecha_inicio: fecha,
      pago: pagoFinal,
      dia_pago,
      valor_actualizado_en: valorActualizadoEn,
      ...(tasa_ea !== null ? { tasa_tipo: rateType } : {}),
    }

    await guardar(() => (inv ? crudOp('inv', 'update', { ...data, _id: inv._id }) : crudOp('inv', 'add', { ...data, crear_tx: esNueva })))
  }

  const remove = async () => {
    if (!inv) return
    if (!confirm(`¿Eliminar "${inv.nombre}"?`)) return
    await crudOpOrBanner('inv', 'delete', { _id: inv._id })
  }

  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="m-nombre">
          Nombre
        </label>
        <input
          className="form-input"
          type="text"
          id="m-nombre"
          maxLength={40}
          value={nombre}
          placeholder="Ej. CDT Bancolombia"
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>
      <div className="form-group">
        <div className="form-label" id="lbl-grp-1">Tipo</div>
        {isEdit ? (
          <div className="rounded-md border bg-muted px-3 py-2 text-[15px] font-medium text-muted-foreground">
            {tipo === 'fija' ? 'Fija' : 'Variable'}
          </div>
        ) : (
          <div className="tipo-toggle" role="group" aria-labelledby="lbl-grp-1">
            <button type="button" className={'tipo-btn ingreso ' + (tipo === 'fija' ? 'sel' : '')} onClick={() => setTipo('fija')}>
              Fija
            </button>
            <button type="button" className={'tipo-btn gasto ' + (tipo === 'variable' ? 'sel' : '')} onClick={() => setTipo('variable')}>
              Variable
            </button>
          </div>
        )}
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="m-invertido">
            Monto invertido
          </label>
          <MoneyInput id="m-invertido" value={invertido} onChange={setInvertido} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="m-actual">
            Valor actual
          </label>
          <MoneyInput id="m-actual" value={actual} onChange={setActual} />
        </div>
      </div>
      <div id="m-tasa-wrap" className="form-group" style={tipo === 'fija' ? undefined : { display: 'none' }}>
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
      <div id="m-pago-wrap" className="form-group" style={tipo === 'fija' ? undefined : { display: 'none' }}>
        <div className="form-label" id="lbl-grp-2">Pago de rendimientos</div>
        <div className="tipo-toggle" role="group" aria-labelledby="lbl-grp-2">
          <button type="button" id="rp-mensual" className={'tipo-btn ingreso  ' + (pago === 'mensual' ? 'sel' : '')} onClick={() => setPago('mensual')}>
            Mensual
          </button>
          <button type="button" id="rp-vencimiento" className={'tipo-btn transfer ' + (pago === 'vencimiento' ? 'sel' : '')} onClick={() => setPago('vencimiento')}>
            Al vencimiento
          </button>
        </div>
      </div>
      <div id="m-dia-pago-wrap" className="form-group" style={tipo === 'fija' && pago === 'mensual' ? undefined : { display: 'none' }}>
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
      <div className="form-group">
        <label className="form-label" htmlFor="m-fecha-ini">
          Fecha inicio
        </label>
        <DatePicker id="m-fecha-ini" value={fecha} onChange={setFecha} />
      </div>
      {!isEdit && <AdvancedToggle checked={esNueva} onChange={setEsNueva} />}
      <FormFooter saveLabel={isEdit ? 'Guardar cambios' : 'Agregar inversión'} onSave={() => void save()} onDelete={isEdit ? () => void remove() : undefined} />
    </>
  )
}
