import { useState } from 'react'
import { AdvancedToggle } from '../../../controls/AdvancedToggle'
import { MoneyInput } from '../../../controls/MoneyInput'
import { cop, nowStr, numToInput, parseMoney, pct } from '../../../lib/format'
import { useModal } from '@/shell/providers/ModalProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import type { InvRendimiento, Inversion } from '../../../types'
import { FechaField, NotasField } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { hintClass } from './styles'
import { useEditarInversion } from './openInvForm'
import { useGuardar } from '@/shell/hooks/useGuardar'

const REND_HINT = {
  capitaliza: 'Sube el valor de la inversión. No entra plata a tu cartera.',
  cuenta: 'Entra como ingreso a tu cartera. El valor de la inversión no cambia.',
}

export function RendimientoForm({ inv }: { inv: Inversion }) {
  const { setModalStatus } = useModal()
  const { apiAction } = useMutations()
  const guardar = useGuardar()
  const editar = useEditarInversion(inv)
  const mv = inv.tasa_mv ?? 0
  const expected = inv.rendimiento_esperado ?? 0
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
    const body: InvRendimiento = {
      monto: valor,
      fecha,
      notas: notas.trim(),
      capitaliza,
      registrar_tx: !capitaliza && registrar,
    }
    await guardar(() => apiAction(`/api/inv/${inv._id}/rendimiento`, body))
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
      <FechaField id="m-fecha" label="Fecha" value={fecha} onChange={setFecha} />
      <NotasField id="m-notas" placeholder="Ej. Intereses mes de junio" value={notas} onChange={setNotas} />
      <div id="wrap-rend-advanced" style={capitaliza ? { display: 'none' } : undefined}>
        <AdvancedToggle
          checked={registrar}
          onChange={setRegistrar}
          label="Registrar en transacciones"
          hint="Desactivá si ya lo registraste en otra parte."
        />
      </div>
      <FormFooter saveLabel="Registrar" onSave={() => void save()} onEdit={editar} editLabel="Editar inversión" />
    </>
  )
}
