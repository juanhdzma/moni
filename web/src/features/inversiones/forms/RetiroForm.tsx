import { useState } from 'react'
import { MoneyInput } from '../../../controls/MoneyInput'
import { numToInput, parseMoney } from '../../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import type { InvRetiro, Inversion } from '../../../types'
import { FechaField, NotasField, RegistrarToggle } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { InversionPanel } from './InversionPanel'
import { hintClass } from './styles'
import { useGuardar } from '@/shell/hooks/useGuardar'

export function RetiroForm({ inv }: { inv: Inversion }) {
  const { estado } = useData()
  const { apiAction } = useMutations()
  const guardar = useGuardar()
  const [tipo, setTipo] = useState<'total' | 'parcial'>('total')
  const [montoTotal, setMontoTotal] = useState(numToInput(inv.valor_actual))
  const [montoParcial, setMontoParcial] = useState('')
  const [saldoQueda, setSaldoQueda] = useState('')
  const [fecha, setFecha] = useState(estado.hoy)
  const [notas, setNotas] = useState('')
  const [registrar, setRegistrar] = useState(true)

  const buildBody = (): InvRetiro => {
    const comun = { fecha, notas: notas.trim(), registrar_tx: registrar }
    if (tipo === 'total') return { tipo: 'total', monto: parseMoney(montoTotal), ...comun }
    return {
      tipo: 'parcial',
      monto: parseMoney(montoParcial),
      ...(saldoQueda.trim() ? { saldo_queda: parseMoney(saldoQueda) } : {}),
      ...comun,
    }
  }

  const save = async () => {
    const body = buildBody()
    await guardar(() => apiAction(`/api/inv/${inv._id}/retiro`, body))
  }

  return (
    <>
      <InversionPanel inv={inv} />
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

      <FechaField id="m-fecha-retiro" type="date" label="Fecha" value={fecha} onChange={setFecha} />
      <NotasField id="m-notas-retiro" placeholder="Ej. Vencimiento CDT" value={notas} onChange={setNotas} />
      <RegistrarToggle checked={registrar} onChange={setRegistrar} />
      <FormFooter saveLabel="Confirmar retiro" onSave={() => void save()} />
    </>
  )
}
