import { useState } from 'react'
import { AdvancedToggle } from '../../../controls/AdvancedToggle'
import { FormFooter } from '../../../controls/FormFooter'
import { MoneyInput } from '../../../controls/MoneyInput'
import { previewAdelanto } from '../../../lib/api'
import { cop, nowStr, parseMoney } from '../../../lib/format'
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
  const [fecha, setFecha] = useState(nowStr())
  const [notas, setNotas] = useState('')
  const [registrarTx, setRegistrarTx] = useState(true)

  const montoV = parseMoney(monto)
  const saldoNuevo: number | null = tieneCupo
    ? disponible.trim()
      ? d.cupo - parseMoney(disponible)
      : null
    : saldoNuevoIn.trim()
      ? parseMoney(saldoNuevoIn)
      : null
  const showBreakdown = Boolean(montoV) && saldoNuevo !== null
  const preview = usePreview<PreviewAdelanto>(showBreakdown, `${montoV}:${saldoNuevo}`, () =>
    previewAdelanto(d._id, { monto: montoV, nuevo_saldo: saldoNuevo ?? 0 }),
  )
  const comision = preview?.comision ?? 0

  const save = async () => {
    if (!montoV || montoV <= 0) {
      setModalStatus('err', 'Ingresá el monto del adelanto')
      return
    }
    if (saldoNuevo === null) {
      setModalStatus('err', tieneCupo ? 'Ingresá el cupo disponible después del adelanto' : 'Ingresá el saldo después del adelanto')
      return
    }
    await guardar(async () => {
      const body: DeudaAdelanto = {
        monto: montoV,
        nuevo_saldo: saldoNuevo,
        fecha,
        notas: notas.trim(),
        descripcion: `Adelanto · ${d.nombre}`,
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
            {showBreakdown && saldoNuevo !== null ? cop(saldoNuevo) : '—'}
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
        fechaLabel="Fecha"
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
