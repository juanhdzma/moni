import { useState } from 'react'
import { AdvancedToggle } from '../../../controls/AdvancedToggle'
import { FormFooter } from '../../../controls/FormFooter'
import { MoneyInput } from '../../../controls/MoneyInput'
import { previewAdelanto } from '../../../lib/api'
import { cop, parseMoney } from '../../../lib/format'
import { useModal } from '@/shell/providers/ModalProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import type { Deuda, DeudaAdelanto, PreviewAdelanto } from '../../../types'
import { FechaNotas } from './FechaNotas'
import { usePreview } from './usePreview'
import { useGuardar } from '@/shell/hooks/useGuardar'

export function AdelantoForm({ d }: { d: Deuda }) {
  const { setModalStatus } = useModal()
  const guardar = useGuardar()
  const { apiAction } = useMutations()
  const tieneCupo = d.cupo > 0
  const [monto, setMonto] = useState('')
  const [disponible, setDisponible] = useState('')
  const [saldoNuevoIn, setSaldoNuevoIn] = useState('')
  const [fecha, setFecha] = useState('')
  const [notas, setNotas] = useState('')
  const [registrarTx, setRegistrarTx] = useState(true)

  const montoV = parseMoney(monto)
  const saldoEscrito = tieneCupo ? disponible : saldoNuevoIn
  const saldoBody = (): Pick<DeudaAdelanto, 'nuevo_saldo' | 'disponible_nuevo'> =>
    tieneCupo ? { disponible_nuevo: parseMoney(disponible) } : { nuevo_saldo: parseMoney(saldoNuevoIn) }
  const showBreakdown = Boolean(montoV) && saldoEscrito.trim() !== ''
  const preview = usePreview<PreviewAdelanto>(showBreakdown, `${montoV}:${saldoEscrito}`, () =>
    previewAdelanto(d._id, { monto: montoV, ...saldoBody() }),
  )
  const comision = preview?.comision ?? 0

  const save = async () => {
    if (!monto.trim()) {
      setModalStatus('err', 'Ingresá el monto del adelanto')
      return
    }
    if (!saldoEscrito.trim()) {
      setModalStatus('err', tieneCupo ? 'Ingresá el cupo disponible después del adelanto' : 'Ingresá el saldo después del adelanto')
      return
    }
    await guardar(async () => {
      const body: DeudaAdelanto = {
        monto: montoV,
        ...saldoBody(),
        fecha: fecha || undefined,
        notas: notas.trim(),
        registrar_tx: registrarTx,
      }
      await apiAction(`/api/deuda/${d._id}/adelanto`, body)
    })
  }

  return (
    <>
      <div className="modal-panel">
        <div className="modal-panel-col">
          <div className="modal-panel-label">Debes</div>
          <div className="modal-panel-value text-deudas">{cop(d.saldo_actual)}</div>
        </div>
        {tieneCupo && (
          <div className="modal-panel-col right">
            <div className="modal-panel-label">Disponible</div>
            <div className="text-base font-semibold">{cop(d.disponible)}</div>
          </div>
        )}
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-monto">Monto del adelanto (COP)</label>
        <MoneyInput id="m-monto" value={monto} onChange={setMonto} />
        <div className="mt-1.5 text-xs text-muted-foreground">La plata que vas a recibir en tu cuenta.</div>
      </div>
      {tieneCupo ? (
        <div className="form-group">
          <label className="form-label" htmlFor="m-disponible-nuevo">Cupo disponible después del adelanto (COP)</label>
          <MoneyInput
            id="m-disponible-nuevo"
            value={disponible}
            onChange={setDisponible}
            placeholder="Lo que te muestra el banco como disponible"
          />
        </div>
      ) : (
        <div className="form-group">
          <label className="form-label" htmlFor="m-saldo-nuevo">Saldo en la tarjeta después del adelanto (COP)</label>
          <MoneyInput
            id="m-saldo-nuevo"
            value={saldoNuevoIn}
            onChange={setSaldoNuevoIn}
            placeholder="Lo que muestra tu banco después"
          />
        </div>
      )}
      <div id="adelanto-breakdown" className="breakdown" style={{ display: showBreakdown ? 'block' : 'none' }}>
        <div className="breakdown-row">
          <span className="breakdown-label">Deuda total después</span>
          <span className="breakdown-value text-deudas" id="adelanto-deuda">
            {preview ? cop(preview.nuevo_saldo) : '—'}
          </span>
        </div>
        <div className="breakdown-row" style={{ display: comision > 0 ? 'flex' : 'none' }} id="adelanto-comision-row">
          <span className="breakdown-label">Comisión / cargos</span>
          <span className="breakdown-value text-deudas" id="adelanto-comision">
            {preview ? cop(comision) : '—'}
          </span>
        </div>
      </div>
      <FechaNotas
        fechaLabel="Fecha (ahora si se omite)"
        fecha={fecha}
        onFecha={setFecha}
        notas={notas}
        onNotas={setNotas}
        notasPlaceholder={"Ej. Adelanto cajero"}
      />
      <AdvancedToggle checked={registrarTx} onChange={setRegistrarTx} label="Registrar como ingreso" hint="Desactivá si ya lo registraste en otra parte." />
      <FormFooter saveLabel="Pedir adelanto" onSave={() => void save()} />
    </>
  )
}
