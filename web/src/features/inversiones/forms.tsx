import { useState } from 'react'
import { cn } from '@/lib/utils'
import { AdvancedToggle } from '../../controls/AdvancedToggle'
import { DatePicker } from '../../controls/DatePicker'
import { FormStatus } from '../../controls/FormStatus'
import { MoneyInput } from '../../controls/MoneyInput'
import { cop, nowStr, numToInput, parseMoney, pct, signStr, todayStr } from '../../lib/format'
import { eaToMv, mvToEa, rendimientoMensualFija, tasaEaDesdeInput } from '../../lib/inversiones'
import { useModal } from '../../shell/ModalProvider'
import { useOpenerCtx, type OpenerCtx } from '../../shell/openers'
import { useMutations } from '../../shell/useMutations'
import type { InvAporte, InvRendimiento, InvRetiro, Inversion, PagoInv, TipoInv } from '../../types'

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e))

const REND_HINT = {
  capitaliza: 'Sube el valor de la inversión. No entra plata a tu cartera.',
  cuenta: 'Entra como ingreso a tu cartera. El valor de la inversión no cambia.',
}

const labelSmall = 'font-normal text-muted-foreground'
const hintClass = 'mt-1.5 text-xs text-muted-foreground'
const rateBtn = (active: boolean) =>
  cn('cursor-pointer px-3 py-2 text-sm font-semibold transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')

function InvForm({ inv }: { inv: Inversion | null }) {
  const { closeModal, setModalStatus } = useModal()
  const { crudOp, crudOpOrBanner } = useMutations()
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
  const equiv = !tasaVal
    ? ''
    : rateType === 'ea'
      ? `Equivale a ${pct(eaToMv(tasaVal), 4)}% MV`
      : `Equivale a ${pct(mvToEa(tasaVal), 2)}% EA`

  const save = async () => {
    const monto = parseMoney(invertido)
    const valorIngresado = parseMoney(actual)
    const tasa_ea = tipo === 'fija' ? tasaEaDesdeInput(tasa, rateType) : null
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
    const data = {
      nombre: nombre.trim(),
      tipo,
      monto_invertido: monto,
      valor_actual: valorActual,
      tasa_ea,
      fecha_inicio: fecha,
      pago: pagoFinal,
      dia_pago,
      valor_actualizado_en: valorActualizadoEn,
    }

    setModalStatus('', 'Guardando...')
    try {
      if (inv) await crudOp('inv', 'update', { ...data, _id: inv._id })
      else await crudOp('inv', 'add', { ...data, crear_tx: esNueva })
    } catch (err) {
      setModalStatus('err', errMsg(err))
    }
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
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={() => void save()}>
          {isEdit ? 'Guardar cambios' : 'Agregar inversión'}
        </button>
        {isEdit && (
          <button className="btn btn-danger" onClick={() => void remove()}>
            Eliminar
          </button>
        )}
        <button className="btn btn-dim" onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}

function YieldForm({ inv }: { inv: Inversion }) {
  const ctx = useOpenerCtx()
  const { closeModal, setModalStatus } = useModal()
  const { apiAction } = useMutations()
  const mv = inv.tasa_ea ? eaToMv(inv.tasa_ea) : 0
  const expected = inv.tasa_ea ? rendimientoMensualFija(inv.valor_actual, inv.tasa_ea) : 0
  const [monto, setMonto] = useState(expected ? numToInput(expected) : '')
  const [capitaliza, setCapitaliza] = useState(inv.pago === 'vencimiento')
  const [fecha, setFecha] = useState(nowStr())
  const [notas, setNotas] = useState('')
  const [registrar, setRegistrar] = useState(true)

  const save = async () => {
    const valor = parseMoney(monto)
    if (!valor || valor <= 0) {
      setModalStatus('err', 'Ingresá un monto válido')
      return
    }
    const registrarTx = !capitaliza && registrar
    setModalStatus('', 'Guardando...')
    try {
      const body: InvRendimiento = {
        monto: valor,
        fecha,
        notas: notas.trim(),
        capitaliza,
        registrar_tx: registrarTx,
      }
      await apiAction(`/api/inv/${inv._id}/rendimiento`, body)
    } catch (err) {
      setModalStatus('err', errMsg(err))
    }
  }

  return (
    <>
      <div className="modal-panel">
        <div>
          <div className="modal-panel-label">Valor actual</div>
          <div className="modal-panel-value text-inversiones-text">{cop(inv.valor_actual)}</div>
        </div>
        {inv.tasa_ea ? (
          <div className="text-right">
            <div className="mb-0.5 text-xs text-muted-foreground">
              {pct(inv.tasa_ea, 2)}% EA · {pct(mv, 4)}% MV
            </div>
            <div className="text-sm text-muted-foreground">Mensual esperado</div>
            <div className="text-lg font-semibold text-inversiones-text">{cop(expected)}</div>
          </div>
        ) : null}
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-monto">
          Monto recibido (COP)
        </label>
        <MoneyInput id="m-monto" value={monto} onChange={setMonto} />
        {expected ? <div className={hintClass}>Pre-llenado con el rendimiento esperado del período.</div> : null}
      </div>
      <div className="form-group">
        <div className="form-label" id="lbl-grp-3">¿Dónde queda el rendimiento?</div>
        <div className="tipo-toggle" role="group" aria-labelledby="lbl-grp-3">
          <button type="button" id="rend-cuenta" className={'tipo-btn ingreso  ' + (capitaliza ? '' : 'sel')} onClick={() => setCapitaliza(false)}>
            Me lo pagan
          </button>
          <button type="button" id="rend-capitaliza" className={'tipo-btn transfer ' + (capitaliza ? 'sel' : '')} onClick={() => setCapitaliza(true)}>
            Capitaliza
          </button>
        </div>
        <div id="rend-hint" className={hintClass}>
          {capitaliza ? REND_HINT.capitaliza : REND_HINT.cuenta}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-fecha">
          Fecha
        </label>
        <DatePicker id="m-fecha" type="datetime-local" value={fecha} onChange={setFecha} />
      </div>
      <div className="form-group">
        <label className={cn('form-label', labelSmall)} htmlFor="m-notas">
          Notas (opcional)
        </label>
        <input
          className="form-input"
          type="text"
          id="m-notas"
          maxLength={30}
          placeholder="Ej. Intereses mes de junio"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>
      <div id="wrap-rend-advanced" style={capitaliza ? { display: 'none' } : undefined}>
        <AdvancedToggle
          checked={registrar}
          onChange={setRegistrar}
          label="Registrar en transacciones"
          hint="Desactivá si ya lo registraste en otra parte."
        />
      </div>
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={() => void save()}>
          Registrar
        </button>
        <button
          className="btn btn-dim"
          onClick={() => {
            closeModal()
            openInvFormById(ctx, inv._id)
          }}
        >
          Editar inversión
        </button>
        <button className="btn btn-dim" onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}

function UpdateValueForm({ inv }: { inv: Inversion }) {
  const ctx = useOpenerCtx()
  const { closeModal, setModalStatus } = useModal()
  const { crudOp } = useMutations()
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(nowStr())
  const nuevo = parseMoney(valor)

  const delta = nuevo - inv.valor_actual
  const totalGain = nuevo - inv.monto_invertido
  const totalGainPct = inv.monto_invertido > 0 ? (totalGain / inv.monto_invertido) * 100 : 0
  const deltaColor = delta >= 0 ? 'text-inversiones-text' : 'text-deudas'
  const gainColor = totalGain >= 0 ? 'text-inversiones-text' : 'text-deudas'

  const save = async () => {
    if (!nuevo || nuevo <= 0) {
      setModalStatus('err', 'Valor inválido')
      return
    }
    setModalStatus('', 'Guardando...')
    try {
      await crudOp('inv', 'update', { ...inv, valor_actual: nuevo, valor_actualizado_en: fecha, _id: inv._id })
    } catch (err) {
      setModalStatus('err', errMsg(err))
    }
  }

  return (
    <>
      <div className="modal-panel">
        <div className="modal-panel-col">
          <div className="modal-panel-label">Último valor</div>
          <div className="modal-panel-value">{cop(inv.valor_actual)}</div>
        </div>
        <div className="modal-panel-col right">
          <div className="modal-panel-label">Invertido</div>
          <div className="text-lg font-semibold">{cop(inv.monto_invertido)}</div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-nuevo-valor">
          Nuevo valor total (COP)
        </label>
        <MoneyInput id="m-nuevo-valor" value={valor} onChange={setValor} />
      </div>
      <div id="inv-value-preview" className="mb-4 overflow-hidden rounded-lg border" style={{ display: nuevo ? 'block' : 'none' }}>
        <div className="flex items-center justify-between border-b px-3.5 py-2.5">
          <span className="text-sm text-muted-foreground">Cambio desde último</span>
          <span className="text-[15px] font-semibold" id="inv-delta">
            {nuevo ? (
              <span className={deltaColor}>
                {signStr(delta)}
                {cop(Math.abs(delta))}
              </span>
            ) : (
              '—'
            )}
          </span>
        </div>
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <span className="text-sm text-muted-foreground">Ganancia total vs invertido</span>
          <span className="text-[15px] font-semibold" id="inv-total-gain">
            {nuevo ? (
              <span className={gainColor}>
                {signStr(totalGain)}
                {cop(Math.abs(totalGain))}{' '}
                <span className="text-xs font-medium">
                  ({signStr(totalGainPct)}
                  {pct(Math.abs(totalGainPct))}%)
                </span>
              </span>
            ) : (
              '—'
            )}
          </span>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-fecha">
          Fecha de valoración
        </label>
        <DatePicker id="m-fecha" type="datetime-local" value={fecha} onChange={setFecha} />
      </div>
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={() => void save()}>
          Actualizar
        </button>
        <button
          className="btn btn-dim"
          onClick={() => {
            closeModal()
            openInvFormById(ctx, inv._id)
          }}
        >
          Editar inversión
        </button>
        <button className="btn btn-dim" onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}

function InvPanel({ inv }: { inv: Inversion }) {
  return (
    <div className="modal-panel">
      <div className="modal-panel-col">
        <div className="modal-panel-label">Valor actual</div>
        <div className="modal-panel-value text-inversiones-text">
          {cop(inv.valor_actual)}
        </div>
      </div>
      <div className="modal-panel-col right">
        <div className="modal-panel-label">Invertido</div>
        <div className="modal-panel-value">{cop(inv.monto_invertido)}</div>
      </div>
    </div>
  )
}

function AddMoreForm({ inv }: { inv: Inversion }) {
  const { closeModal, setModalStatus } = useModal()
  const { apiAction } = useMutations()
  const [monto, setMonto] = useState('')
  const [nuevoValor, setNuevoValor] = useState('')
  const [estimado, setEstimado] = useState<number | null>(null)
  const [fecha, setFecha] = useState(nowStr())
  const [notas, setNotas] = useState('')
  const [registrar, setRegistrar] = useState(true)

  const onMonto = (v: string) => {
    setMonto(v)
    const aporte = parseMoney(v)
    if (aporte) setEstimado(inv.valor_actual + aporte)
  }

  const save = async () => {
    const aporte = parseMoney(monto)
    const nuevoVal = nuevoValor ? parseMoney(nuevoValor) : inv.valor_actual + aporte
    if (!aporte || aporte <= 0) {
      setModalStatus('err', 'Ingresá el monto que agregas')
      return
    }
    setModalStatus('', 'Guardando...')
    try {
      const body: InvAporte = {
        monto: aporte,
        nuevo_valor: nuevoVal,
        fecha,
        notas: notas.trim(),
        registrar_tx: registrar,
      }
      await apiAction(`/api/inv/${inv._id}/aporte`, body)
    } catch (err) {
      setModalStatus('err', errMsg(err))
    }
  }

  return (
    <>
      <InvPanel inv={inv} />
      <div className="form-group">
        <label className="form-label" htmlFor="m-monto">
          Monto que agregas (COP)
        </label>
        <MoneyInput id="m-monto" value={monto} onChange={onMonto} />
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
      <div className="form-group">
        <label className="form-label" htmlFor="m-fecha">
          Fecha
        </label>
        <DatePicker id="m-fecha" type="datetime-local" value={fecha} onChange={setFecha} />
      </div>
      <div className="form-group">
        <label className={cn('form-label', labelSmall)} htmlFor="m-notas">
          Notas (opcional)
        </label>
        <input
          className="form-input"
          type="text"
          id="m-notas"
          maxLength={30}
          placeholder="Ej. Aporte mensual"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>
      <AdvancedToggle
        checked={registrar}
        onChange={setRegistrar}
        label="Registrar en transacciones"
        hint="Desactivá si ya lo registraste en otra parte."
      />
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={() => void save()}>
          Agregar aporte
        </button>
        <button className="btn btn-dim" onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}

function RetirarForm({ inv }: { inv: Inversion }) {
  const { closeModal, setModalStatus } = useModal()
  const { apiAction } = useMutations()
  const [tipo, setTipo] = useState<'total' | 'parcial'>('total')
  const [montoTotal, setMontoTotal] = useState(numToInput(inv.valor_actual))
  const [montoParcial, setMontoParcial] = useState('')
  const [saldoQueda, setSaldoQueda] = useState('')
  const [fecha, setFecha] = useState(nowStr())
  const [notas, setNotas] = useState('')
  const [registrar, setRegistrar] = useState(true)

  const save = async () => {
    const notasFinal = notas.trim()
    if (tipo === 'total') {
      const monto = parseMoney(montoTotal)
      if (!monto) {
        setModalStatus('err', 'Ingresá el monto que recibís')
        return
      }
      setModalStatus('', 'Guardando...')
      try {
        const body: InvRetiro = { tipo: 'total', monto, fecha, notas: notasFinal, registrar_tx: registrar }
        await apiAction(`/api/inv/${inv._id}/retiro`, body)
      } catch (err) {
        setModalStatus('err', errMsg(err))
      }
    } else {
      const monto = parseMoney(montoParcial)
      const saldo = parseMoney(saldoQueda)
      if (!monto) {
        setModalStatus('err', 'Ingresá el monto que retirás')
        return
      }
      if (!saldoQueda.trim()) {
        setModalStatus('err', 'Ingresá el saldo que queda en el fondo')
        return
      }
      setModalStatus('', 'Guardando...')
      try {
        const body: InvRetiro = {
          tipo: 'parcial',
          monto,
          saldo_queda: saldo,
          fecha,
          notas: notasFinal,
          registrar_tx: registrar,
        }
        await apiAction(`/api/inv/${inv._id}/retiro`, body)
      } catch (err) {
        setModalStatus('err', errMsg(err))
      }
    }
  }

  return (
    <>
      <InvPanel inv={inv} />
      <div className="form-group">
        <div className="form-label" id="lbl-grp-4">Tipo de retiro</div>
        <div className="tipo-toggle" role="group" aria-labelledby="lbl-grp-4">
          <button type="button" className={'tipo-btn ingreso' + (tipo === 'total' ? ' sel' : '')} data-retiro="total" onClick={() => setTipo('total')}>
            Total
          </button>
          <button type="button" className={'tipo-btn transfer' + (tipo === 'parcial' ? ' sel' : '')} data-retiro="parcial" onClick={() => setTipo('parcial')}>
            Parcial
          </button>
        </div>
      </div>

      <div id="retiro-total-fields" style={tipo === 'total' ? undefined : { display: 'none' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="m-monto-total">
            Monto que recibís
          </label>
          <MoneyInput id="m-monto-total" value={montoTotal} onChange={setMontoTotal} />
          <div className={hintClass}>Pre-llenado con el valor actual — ajustá si difiere al momento del retiro.</div>
        </div>
      </div>

      <div id="retiro-parcial-fields" style={tipo === 'parcial' ? undefined : { display: 'none' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="m-monto-parcial">
            Monto que retirás
          </label>
          <MoneyInput id="m-monto-parcial" value={montoParcial} onChange={setMontoParcial} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="m-saldo-queda">
            Saldo que queda en el fondo
          </label>
          <MoneyInput id="m-saldo-queda" value={saldoQueda} onChange={setSaldoQueda} />
          <div className={hintClass}>Valor total de la inversión después del retiro.</div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="m-fecha-retiro">
          Fecha
        </label>
        <DatePicker id="m-fecha-retiro" type="datetime-local" value={fecha} onChange={setFecha} />
      </div>
      <div className="form-group">
        <label className={cn('form-label', labelSmall)} htmlFor="m-notas-retiro">
          Notas (opcional)
        </label>
        <input
          className="form-input"
          type="text"
          id="m-notas-retiro"
          maxLength={30}
          placeholder="Ej. Vencimiento CDT"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>
      <AdvancedToggle
        checked={registrar}
        onChange={setRegistrar}
        label="Registrar en transacciones"
        hint="Desactivá si ya lo registraste en otra parte."
      />
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={() => void save()}>
          Confirmar retiro
        </button>
        <button className="btn btn-dim" onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}

export function openInvForm(ctx: OpenerCtx, inv: Inversion | null = null): void {
  ctx.openModal(inv ? 'Editar inversión' : 'Nueva inversión', <InvForm inv={inv} />)
}

export function openInvFormById(ctx: OpenerCtx, id: number): void {
  openInvForm(ctx, ctx.estado.inversiones.find((i) => i._id === id) ?? null)
}

export function openInvYieldFormById(ctx: OpenerCtx, id: number): void {
  const inv = ctx.estado.inversiones.find((i) => i._id === id)
  if (!inv) return
  ctx.openModal(`Registrar rendimiento · ${inv.nombre}`, <YieldForm inv={inv} />)
}

export function openInvUpdateValueFormById(ctx: OpenerCtx, id: number): void {
  const inv = ctx.estado.inversiones.find((i) => i._id === id)
  if (!inv) return
  ctx.openModal(`Actualizar valor · ${inv.nombre}`, <UpdateValueForm inv={inv} />)
}

export function openInvAddMoreFormById(ctx: OpenerCtx, id: number): void {
  const inv = ctx.estado.inversiones.find((i) => i._id === id)
  if (!inv) return
  ctx.openModal(`Invertir más · ${inv.nombre}`, <AddMoreForm inv={inv} />)
}

export function openInvRetirarFormById(ctx: OpenerCtx, id: number): void {
  const inv = ctx.estado.inversiones.find((i) => i._id === id)
  if (!inv) return
  ctx.openModal(`Retirar · ${inv.nombre}`, <RetirarForm inv={inv} />)
}
