import { useState, type CSSProperties } from 'react'
import { AdvancedToggle } from '../../controls/AdvancedToggle'
import { DatePicker } from '../../controls/DatePicker'
import { FormStatus } from '../../controls/FormStatus'
import { MoneyInput } from '../../controls/MoneyInput'
import { Select } from '../../controls/Select'
import { comisionAdelanto, desglosePago } from '../../lib/deudas'
import { cop, nowStr, numToInput, parseMoney } from '../../lib/format'
import { useModal } from '../../shell/ModalProvider'
import { useOpenerCtx, type OpenerCtx } from '../../shell/openers'
import { useMutations } from '../../shell/useMutations'
import type { Deuda } from '../../types'

const FRANQUICIAS = ['Visa', 'Mastercard', 'Amex', 'Otra'].map((f) => ({ value: f, label: f }))

const errMsg = (e: unknown) => '❌ ' + (e instanceof Error ? e.message : String(e))

const summaryBox: CSSProperties = {
  background: 'var(--bg)',
  borderRadius: 'var(--radius-sm)',
  padding: '14px 16px',
  marginBottom: 18,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}
const summaryLabel: CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  marginBottom: 3,
}
const summaryBig: CSSProperties = { fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--debt-mid)' }
const summarySubLabel: CSSProperties = { fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 3 }
const hintStyle: CSSProperties = { fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 5 }
const breakdownBox: CSSProperties = {
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  overflow: 'hidden',
  marginBottom: 14,
}
const breakdownLabel: CSSProperties = { fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }
const breakdownValue: CSSProperties = { fontSize: 'var(--text-md)', fontWeight: 700 }
const breakdownRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 14px',
}
const notasLabel: CSSProperties = {
  textTransform: 'none',
  letterSpacing: 0,
  fontSize: 'var(--text-sm)',
  color: 'var(--text-secondary)',
}

function DeudaForm({ d }: { d: Deuda | null }) {
  const { closeModal, setModalStatus } = useModal()
  const { crudOp, crudOpOrBanner } = useMutations()
  const isEdit = d !== null
  const [esTarjeta, setEsTarjeta] = useState(Boolean(d?.es_tarjeta))
  const [nombre, setNombre] = useState(d?.nombre || '')
  const [montoIni, setMontoIni] = useState(d ? numToInput(d.monto_inicial) : '')
  const [cupo, setCupo] = useState(d ? numToInput(d.cupo) : '')
  const [franquicia, setFranquicia] = useState(d && FRANQUICIAS.some((f) => f.value === d.franquicia) ? d.franquicia : 'Visa')
  const [saldo, setSaldo] = useState(d ? numToInput(d.saldo_actual) : '')
  const [tasa, setTasa] = useState(d?.tasa_ea ? String(d.tasa_ea) : '')
  const [cuota, setCuota] = useState(d ? numToInput(d.cuota_mensual) : '')
  const [fechaIni, setFechaIni] = useState(d?.fecha_inicio?.split('T')[0] || '')
  const [proxima, setProxima] = useState(d?.proxima_cuota?.split('T')[0] || '')
  const [esNueva, setEsNueva] = useState(true)

  const save = async () => {
    const nombreV = nombre.trim()
    const saldoV = parseMoney(saldo)
    if (!nombreV) {
      setModalStatus('err', 'Nombre requerido')
      return
    }
    if (!esTarjeta && !saldoV) {
      setModalStatus('err', 'Saldo requerido')
      return
    }
    const data = esTarjeta
      ? {
          nombre: nombreV,
          monto_inicial: 0,
          saldo_actual: saldoV,
          tasa_ea: 0,
          cuota_mensual: 0,
          fecha_inicio: '',
          proxima_cuota: '',
          es_tarjeta: true,
          cupo: parseMoney(cupo),
          franquicia,
        }
      : {
          nombre: nombreV,
          monto_inicial: parseMoney(montoIni),
          saldo_actual: saldoV,
          tasa_ea: parseFloat(tasa) || 0,
          cuota_mensual: parseMoney(cuota),
          fecha_inicio: fechaIni,
          proxima_cuota: proxima,
          es_tarjeta: false,
          cupo: 0,
          franquicia: '',
        }
    setModalStatus('', 'Guardando...')
    try {
      if (d) await crudOp('deuda', 'update', { ...data, _id: d._id })
      else await crudOp('deuda', 'add', { ...data, crear_tx: esTarjeta ? false : esNueva })
    } catch (err) {
      setModalStatus('err', errMsg(err))
    }
  }

  const remove = async () => {
    if (!d) return
    if (!confirm(`¿Eliminar "${d.nombre}"?`)) return
    await crudOpOrBanner('deuda', 'delete', { _id: d._id })
  }

  return (
    <>
      <div className="form-group">
        <label className="form-label">Tipo</label>
        <div className="tipo-toggle">
          <button type="button" className={'tipo-btn transfer prestamo ' + (!esTarjeta ? 'sel' : '')} onClick={() => setEsTarjeta(false)}>
            Préstamo
          </button>
          <button type="button" className={'tipo-btn transfer tarjeta  ' + (esTarjeta ? 'sel' : '')} onClick={() => setEsTarjeta(true)}>
            Tarjeta
          </button>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Nombre</label>
        <input
          className="form-input"
          type="text"
          id="m-nombre"
          maxLength={40}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={esTarjeta ? 'Ej. Tarjeta Visa' : 'Ej. Crédito de consumo'}
        />
      </div>
      <div className="form-group" id="wrap-monto-ini" style={esTarjeta ? { display: 'none' } : undefined}>
        <label className="form-label">{isEdit ? 'Monto inicial' : 'Monto del crédito'} (COP)</label>
        <MoneyInput id="m-monto-ini" value={montoIni} onChange={setMontoIni} />
      </div>
      <div id="wrap-cupo" style={esTarjeta ? undefined : { display: 'none' }}>
        <div className="form-group">
          <label className="form-label">Cupo (COP)</label>
          <MoneyInput id="m-cupo" value={cupo} onChange={setCupo} />
        </div>
        <div className="form-group">
          <label className="form-label">Franquicia</label>
          <Select id="m-franquicia" value={franquicia} onChange={setFranquicia} options={FRANQUICIAS} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" id="saldo-label">
          {esTarjeta ? 'Deuda actual' : 'Saldo actual'} (COP)
        </label>
        <MoneyInput id="m-saldo" value={saldo} onChange={setSaldo} />
        <div
          id="saldo-hint"
          style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 5, display: esTarjeta ? '' : 'none' }}
        >
          Dejá 0 si la tarjeta todavía no tiene gastos.
        </div>
      </div>
      <div id="wrap-prestamo-fields" style={esTarjeta ? { display: 'none' } : undefined}>
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">Tasa EA (%)</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              id="m-tasa"
              value={tasa}
              onChange={(e) => setTasa(e.target.value)}
              placeholder="24"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Cuota mensual</label>
            <MoneyInput id="m-cuota" value={cuota} onChange={setCuota} />
          </div>
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">Fecha inicio</label>
            <DatePicker id="m-fecha-ini" value={fechaIni} onChange={setFechaIni} />
          </div>
          <div className="form-group">
            <label className="form-label">Próxima cuota</label>
            <DatePicker id="m-proxima" value={proxima} onChange={setProxima} />
          </div>
        </div>
      </div>
      <div id="wrap-advanced" style={esTarjeta ? { display: 'none' } : undefined}>
        {!isEdit && <AdvancedToggle checked={esNueva} onChange={setEsNueva} />}
      </div>
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={() => void save()}>
          {isEdit ? 'Guardar cambios' : 'Agregar deuda'}
        </button>
        {isEdit && (
          <button className="btn btn-danger" onClick={() => void remove()}>
            Eliminar
          </button>
        )}
        <button className="btn btn-dim" style={{ marginLeft: 'auto' }} onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}

function PagoForm({ d, liquidar }: { d: Deuda; liquidar: boolean }) {
  const ctx = useOpenerCtx()
  const { closeModal, setModalStatus } = useModal()
  const { apiAction } = useMutations()
  const [monto, setMonto] = useState(liquidar ? numToInput(d.saldo_actual) : numToInput(d.cuota_mensual))
  const [saldoNuevo, setSaldoNuevo] = useState(liquidar ? '0' : '')
  const [fecha, setFecha] = useState(nowStr())
  const [notas, setNotas] = useState('')
  const [registrarTx, setRegistrarTx] = useState(true)
  const hint = liquidar
    ? 'Ajustá si el banco cobra intereses adicionales al cancelar.'
    : 'Pre-llenado con la cuota mensual — ajustá si aplica.'

  const saldoAnterior = d.saldo_actual
  const total = parseMoney(monto)
  const showBreakdown = Boolean(total) && saldoNuevo.trim() !== ''
  const { capital, intereses } = desglosePago(saldoAnterior, total, parseMoney(saldoNuevo))

  const save = async () => {
    const saldoNuevoV = parseMoney(saldoNuevo)
    if (!total || total <= 0) {
      setModalStatus('err', 'Ingresá el monto total pagado')
      return
    }
    if (!saldoNuevo.trim()) {
      setModalStatus('err', 'Ingresá el saldo capital después del pago')
      return
    }
    if (saldoNuevoV > saldoAnterior) {
      setModalStatus('err', 'El saldo nuevo no puede superar el saldo anterior')
      return
    }
    const desc = `Cuota · ${d.nombre} (capital ${cop(capital)}, intereses ${cop(intereses)})`
    setModalStatus('', 'Guardando...')
    try {
      await apiAction(`/api/deuda/${d._id}/pago`, {
        nuevo_saldo: saldoNuevoV,
        total_pagado: total,
        intereses,
        fecha,
        notas: notas.trim(),
        descripcion: desc,
        registrar_tx: registrarTx,
        avanzar_cuota: !liquidar,
      })
    } catch (err) {
      setModalStatus('err', errMsg(err))
    }
  }

  return (
    <>
      <div style={summaryBox}>
        <div>
          <div style={summaryLabel}>Saldo pendiente</div>
          <div style={summaryBig}>{cop(d.saldo_actual)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={summarySubLabel}>Cuota mensual</div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{cop(d.cuota_mensual)}</div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Monto total pagado (COP)</label>
        <MoneyInput id="m-monto" value={monto} onChange={setMonto} />
        <div style={hintStyle}>{hint}</div>
      </div>
      <div className="form-group">
        <label className="form-label">Saldo capital después del pago</label>
        <MoneyInput id="m-saldo-nuevo" value={saldoNuevo} onChange={setSaldoNuevo} placeholder="Lo que muestra tu banco después" />
      </div>
      <div id="pay-breakdown" style={{ ...breakdownBox, display: showBreakdown ? 'block' : 'none' }}>
        <div style={{ ...breakdownRow, borderBottom: '1px solid var(--border)' }}>
          <span style={breakdownLabel}>→ A capital</span>
          <span style={{ ...breakdownValue, color: 'var(--accent)' }} id="pay-capital">
            {showBreakdown ? cop(capital) : '—'}
          </span>
        </div>
        <div style={breakdownRow}>
          <span style={breakdownLabel}>→ A intereses</span>
          <span style={{ ...breakdownValue, color: 'var(--red)' }} id="pay-intereses">
            {showBreakdown ? cop(intereses) : '—'}
          </span>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Fecha del pago</label>
        <DatePicker id="m-fecha" type="datetime-local" value={fecha} onChange={setFecha} />
      </div>
      <div className="form-group">
        <label className="form-label" style={notasLabel}>
          Notas (opcional)
        </label>
        <input
          className="form-input"
          type="text"
          id="m-notas"
          maxLength={30}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder={liquidar ? 'Abonar a la deuda' : 'Ej. Cuota #14'}
        />
      </div>
      <AdvancedToggle
        checked={registrarTx}
        onChange={setRegistrarTx}
        label="Registrar en transacciones"
        hint="Desactivá si ya lo registraste en otra parte."
      />
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={() => void save()}>
          {liquidar ? 'Abonar' : 'Registrar pago'}
        </button>
        <button
          className="btn btn-dim"
          onClick={() => {
            closeModal()
            openDeudaFormById(ctx, d._id)
          }}
        >
          Editar deuda
        </button>
        <button className="btn btn-dim" style={{ marginLeft: 'auto' }} onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}

function AdelantoForm({ d }: { d: Deuda }) {
  const { closeModal, setModalStatus } = useModal()
  const { apiAction } = useMutations()
  const tieneCupo = d.cupo > 0
  const [monto, setMonto] = useState('')
  const [disponible, setDisponible] = useState('')
  const [saldoNuevoIn, setSaldoNuevoIn] = useState('')
  const [fecha, setFecha] = useState(nowStr())
  const [notas, setNotas] = useState('')
  const [registrarTx, setRegistrarTx] = useState(true)

  const saldoAnterior = d.saldo_actual
  const montoV = parseMoney(monto)
  const saldoNuevo: number | null = tieneCupo
    ? disponible.trim()
      ? d.cupo - parseMoney(disponible)
      : null
    : saldoNuevoIn.trim()
      ? parseMoney(saldoNuevoIn)
      : null
  const showBreakdown = Boolean(montoV) && saldoNuevo !== null
  const comision = saldoNuevo === null ? 0 : comisionAdelanto(saldoAnterior, montoV, saldoNuevo)

  const save = async () => {
    if (!montoV || montoV <= 0) {
      setModalStatus('err', 'Ingresá el monto del adelanto')
      return
    }
    if (saldoNuevo === null) {
      setModalStatus('err', tieneCupo ? 'Ingresá el cupo disponible después del adelanto' : 'Ingresá el saldo después del adelanto')
      return
    }
    if (saldoNuevo < saldoAnterior) {
      setModalStatus('err', 'El saldo nuevo no puede ser menor al saldo actual')
      return
    }
    setModalStatus('', 'Guardando...')
    try {
      await apiAction(`/api/deuda/${d._id}/adelanto`, {
        monto: montoV,
        nuevo_saldo: saldoNuevo,
        fecha,
        notas: notas.trim(),
        descripcion: `Adelanto · ${d.nombre}`,
        registrar_tx: registrarTx,
      })
    } catch (err) {
      setModalStatus('err', errMsg(err))
    }
  }

  return (
    <>
      <div style={summaryBox}>
        <div>
          <div style={summaryLabel}>Debes</div>
          <div style={summaryBig}>{cop(d.saldo_actual)}</div>
        </div>
        {tieneCupo && (
          <div style={{ textAlign: 'right' }}>
            <div style={summarySubLabel}>Disponible</div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{cop(Math.max(0, d.cupo - d.saldo_actual))}</div>
          </div>
        )}
      </div>
      <div className="form-group">
        <label className="form-label">Monto del adelanto (COP)</label>
        <MoneyInput id="m-monto" value={monto} onChange={setMonto} />
        <div style={hintStyle}>La plata que vas a recibir en tu cuenta.</div>
      </div>
      {tieneCupo ? (
        <div className="form-group">
          <label className="form-label">Cupo disponible después del adelanto (COP)</label>
          <MoneyInput
            id="m-disponible-nuevo"
            value={disponible}
            onChange={setDisponible}
            placeholder="Lo que te muestra el banco como disponible"
          />
        </div>
      ) : (
        <div className="form-group">
          <label className="form-label">Saldo en la tarjeta después del adelanto (COP)</label>
          <MoneyInput
            id="m-saldo-nuevo"
            value={saldoNuevoIn}
            onChange={setSaldoNuevoIn}
            placeholder="Lo que muestra tu banco después"
          />
        </div>
      )}
      <div id="adelanto-breakdown" style={{ ...breakdownBox, display: showBreakdown ? 'block' : 'none' }}>
        <div style={{ ...breakdownRow, borderBottom: '1px solid var(--border)' }}>
          <span style={breakdownLabel}>→ Deuda total después</span>
          <span style={{ ...breakdownValue, color: 'var(--debt-mid)' }} id="adelanto-deuda">
            {showBreakdown && saldoNuevo !== null ? cop(saldoNuevo) : '—'}
          </span>
        </div>
        <div style={{ ...breakdownRow, display: comision > 0 ? 'flex' : 'none' }} id="adelanto-comision-row">
          <span style={breakdownLabel}>→ Comisión / cargos</span>
          <span style={{ ...breakdownValue, color: 'var(--red)' }} id="adelanto-comision">
            {showBreakdown ? cop(comision) : '—'}
          </span>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Fecha</label>
        <DatePicker id="m-fecha" type="datetime-local" value={fecha} onChange={setFecha} />
      </div>
      <div className="form-group">
        <label className="form-label" style={notasLabel}>
          Notas (opcional)
        </label>
        <input
          className="form-input"
          type="text"
          id="m-notas"
          maxLength={30}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej. Adelanto cajero"
        />
      </div>
      <AdvancedToggle checked={registrarTx} onChange={setRegistrarTx} label="Registrar como ingreso" hint="Desactivá si ya lo registraste en otra parte." />
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={() => void save()}>
          Pedir adelanto
        </button>
        <button className="btn btn-dim" style={{ marginLeft: 'auto' }} onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}

export function openDeudaForm(ctx: OpenerCtx, d: Deuda | null = null): void {
  ctx.openModal(d ? 'Editar deuda' : 'Nueva deuda', <DeudaForm d={d} />)
}

export function openDeudaFormById(ctx: OpenerCtx, id: number): void {
  openDeudaForm(ctx, ctx.estado.deudas.find((d) => d._id === id) ?? null)
}

export function openDeudaPayFormById(ctx: OpenerCtx, id: number, liquidar = false): void {
  const d = ctx.estado.deudas.find((x) => x._id === id)
  if (!d) return
  ctx.openModal(liquidar ? `Abonar · ${d.nombre}` : `Pagar cuota · ${d.nombre}`, <PagoForm d={d} liquidar={liquidar} />)
}

export function openDeudaAdelantoFormById(ctx: OpenerCtx, id: number): void {
  const d = ctx.estado.deudas.find((x) => x._id === id)
  if (!d) return
  ctx.openModal(`Pedir adelanto · ${d.nombre}`, <AdelantoForm d={d} />)
}
