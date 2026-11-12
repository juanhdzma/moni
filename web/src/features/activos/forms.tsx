import { useState, type ReactNode } from 'react'
import { AdvancedToggle } from '../../controls/AdvancedToggle'
import { DatePicker } from '../../controls/DatePicker'
import { FormStatus } from '../../controls/FormStatus'
import { MoneyInput } from '../../controls/MoneyInput'
import { cop, nowStr, numToInput, parseMoney, pct, signStr, todayStr } from '../../lib/format'
import { cambioValor } from '../../lib/inversiones'
import { useOpenerCtx, type OpenerCtx } from '../../shell/openers'
import { useModal } from '../../shell/ModalProvider'
import { useMutations } from '../../shell/useMutations'
import type { Activo, ActivoIn, WithId } from '../../types'

const errMsg = (e: unknown) => '❌ ' + (e instanceof Error ? e.message : String(e))
const tone = (n: number) => (n >= 0 ? 'var(--income-mid)' : 'var(--expense-mid)')

const summaryBox = { background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as const
const summaryLabel = { fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 } as const
const previewBox = { borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 14 } as const
const previewRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' } as const
const previewLabel = { fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' } as const
const previewValue = { fontSize: 'var(--text-md)', fontWeight: 700 } as const

export function openActivoForm(ctx: OpenerCtx, activo: Activo | null = null): void {
  ctx.openModal(activo ? 'Editar activo' : 'Nuevo activo', <ActivoForm activo={activo} />)
}

export function openActivoFormById(ctx: OpenerCtx, id: number): void {
  openActivoForm(ctx, ctx.estado.activos.find((a) => a._id === id) ?? null)
}

export function openActivoUpdateFormById(ctx: OpenerCtx, id: number): void {
  const a = ctx.estado.activos.find((x) => x._id === id)
  if (!a) return
  ctx.openModal(`Actualizar valor · ${a.nombre}`, <ActivoUpdateForm activo={a} />)
}

export function openActivoSellFormById(ctx: OpenerCtx, id: number): void {
  const a = ctx.estado.activos.find((x) => x._id === id)
  if (!a) return
  ctx.openModal(`Vender · ${a.nombre}`, <ActivoSellForm activo={a} />)
}

function ActivoForm({ activo }: { activo: Activo | null }): ReactNode {
  const isEdit = activo !== null
  const { closeModal, setModalStatus } = useModal()
  const { crudOp, crudOpOrBanner } = useMutations()
  const [nombre, setNombre] = useState(activo?.nombre ?? '')
  const [valIni, setValIni] = useState(activo ? numToInput(activo.valor_inicial) : '')
  const [valAct, setValAct] = useState(activo ? numToInput(activo.valor_actual) : '')
  const [fechaAdq, setFechaAdq] = useState(activo?.fecha_adquisicion?.split('T')[0] || todayStr())
  const [esNueva, setEsNueva] = useState(true)

  const save = async () => {
    const nom = nombre.trim()
    const ini = parseMoney(valIni)
    const act = parseMoney(valAct)
    if (!nom) { setModalStatus('err', 'Nombre requerido'); return }
    if (!ini) { setModalStatus('err', 'Precio de compra requerido'); return }
    const valorActual = act || ini
    const valorActualizadoEn = !activo ? fechaAdq : activo.valor_actual === valorActual ? activo.valor_actualizado_en : todayStr()
    const data = { nombre: nom, valor_inicial: ini, valor_actual: valorActual, fecha_adquisicion: fechaAdq, valor_actualizado_en: valorActualizadoEn }
    setModalStatus('', 'Guardando...')
    try {
      if (activo) await crudOp('activo', 'update', { ...data, _id: activo._id } as unknown as ActivoIn & WithId)
      else await crudOp('activo', 'add', { ...data, crear_tx: esNueva })
    } catch (err) { setModalStatus('err', errMsg(err)) }
  }

  const remove = async () => {
    if (!activo) return
    if (!confirm(`¿Eliminar "${activo.nombre}"?`)) return
    await crudOpOrBanner('activo', 'delete', { _id: activo._id })
  }

  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="m-nombre">Nombre</label>
        <input className="form-input" type="text" id="m-nombre" maxLength={40} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Apartamento Bogotá" />
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="m-val-ini">{isEdit ? 'Valor inicial' : 'Precio de compra'} (COP)</label>
          <MoneyInput id="m-val-ini" value={valIni} onChange={setValIni} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="m-val-act">Valor actual (COP)</label>
          <MoneyInput id="m-val-act" value={valAct} onChange={setValAct} placeholder="Igual al inicial si no cambia" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Fecha de adquisición</label>
        <DatePicker id="m-fecha-adq" value={fechaAdq} onChange={setFechaAdq} />
      </div>
      {!isEdit && <AdvancedToggle checked={esNueva} onChange={setEsNueva} />}
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={() => void save()}>{isEdit ? 'Guardar cambios' : 'Agregar activo'}</button>
        {isEdit && <button className="btn btn-danger" onClick={() => void remove()}>Eliminar</button>}
        <button className="btn btn-dim" style={{ marginLeft: 'auto' }} onClick={closeModal}>Cancelar</button>
      </div>
      <FormStatus />
    </>
  )
}

function ActivoUpdateForm({ activo: a }: { activo: Activo }): ReactNode {
  const ctx = useOpenerCtx()
  const { closeModal, setModalStatus } = useModal()
  const { crudOp } = useMutations()
  const [nuevoTxt, setNuevoTxt] = useState('')
  const [fecha, setFecha] = useState(nowStr())
  const cambio = a.valor_actual - a.valor_inicial
  const cambioPct = a.valor_inicial > 0 ? (cambio / a.valor_inicial) * 100 : 0
  const nuevo = parseMoney(nuevoTxt)
  const { delta, total, totalPct } = cambioValor(nuevo, a.valor_actual, a.valor_inicial)

  const save = async () => {
    if (!nuevo || nuevo <= 0) { setModalStatus('err', 'Valor inválido'); return }
    setModalStatus('', 'Guardando...')
    try {
      await crudOp('activo', 'update', { ...a, valor_actual: nuevo, valor_actualizado_en: fecha, _id: a._id } as unknown as ActivoIn & WithId)
    } catch (err) { setModalStatus('err', errMsg(err)) }
  }

  return (
    <>
      <div style={summaryBox}>
        <div>
          <div style={summaryLabel}>Valor actual</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{cop(a.valor_actual)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 3 }}>Vs. precio inicial</div>
          <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: tone(cambio) }}>
            {signStr(cambio)}{cop(Math.abs(cambio))} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>({signStr(cambioPct)}{pct(Math.abs(cambioPct))}%)</span>
          </div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-nuevo-valor">Nuevo valor (COP)</label>
        <MoneyInput id="m-nuevo-valor" value={nuevoTxt} onChange={setNuevoTxt} />
      </div>
      <div id="activo-update-preview" style={{ ...previewBox, display: nuevo ? 'block' : 'none' }}>
        <div style={{ ...previewRow, borderBottom: '1px solid var(--border)' }}>
          <span style={previewLabel}>Cambio desde último</span>
          <span style={previewValue} id="activo-delta">
            <span style={{ color: tone(delta) }}>{signStr(delta)}{cop(Math.abs(delta))}</span>
          </span>
        </div>
        <div style={previewRow}>
          <span style={previewLabel}>Variación vs precio inicial</span>
          <span style={previewValue} id="activo-total">
            <span style={{ color: tone(total) }}>{signStr(total)}{cop(Math.abs(total))} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>({signStr(totalPct)}{pct(Math.abs(totalPct))}%)</span></span>
          </span>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Fecha de valoración</label>
        <DatePicker id="m-fecha" type="datetime-local" value={fecha} onChange={setFecha} />
      </div>
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={() => void save()}>Actualizar</button>
        <button className="btn btn-dim" onClick={() => { closeModal(); openActivoFormById(ctx, a._id) }}>Editar activo</button>
        <button className="btn btn-dim" style={{ marginLeft: 'auto' }} onClick={closeModal}>Cancelar</button>
      </div>
      <FormStatus />
    </>
  )
}

function ActivoSellForm({ activo: a }: { activo: Activo }): ReactNode {
  const { closeModal, setModalStatus } = useModal()
  const { apiAction } = useMutations()
  const [precioTxt, setPrecioTxt] = useState(numToInput(a.valor_actual))
  const [fecha, setFecha] = useState(nowStr())
  const [notas, setNotas] = useState('')
  const [registrarTx, setRegistrarTx] = useState(true)
  const precio = parseMoney(precioTxt)
  const vsIni = precio - a.valor_inicial
  const vsAct = precio - a.valor_actual

  const save = async () => {
    if (!precio || precio <= 0) { setModalStatus('err', 'Precio de venta inválido'); return }
    setModalStatus('', 'Guardando...')
    try {
      await apiAction(`/api/activo/${a._id}/venta`, { precio, fecha, notas: notas.trim(), registrar_tx: registrarTx })
    } catch (err) { setModalStatus('err', errMsg(err)) }
  }

  return (
    <>
      <div style={summaryBox}>
        <div>
          <div style={summaryLabel}>Valor actual</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{cop(a.valor_actual)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 3 }}>Precio inicial</div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{cop(a.valor_inicial)}</div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-precio">Precio de venta (COP)</label>
        <MoneyInput id="m-precio" value={precioTxt} onChange={setPrecioTxt} />
      </div>
      <div id="activo-sell-preview" style={{ ...previewBox, display: precio ? 'block' : 'none' }}>
        <div style={{ ...previewRow, borderBottom: '1px solid var(--border)' }}>
          <span style={previewLabel}>Ganancia vs precio inicial</span>
          <span style={previewValue} id="sell-gain-ini">
            <span style={{ color: tone(vsIni) }}>{signStr(vsIni)}{cop(Math.abs(vsIni))}</span>
          </span>
        </div>
        <div style={previewRow}>
          <span style={previewLabel}>Diferencia vs último valor</span>
          <span style={previewValue} id="sell-gain-act">
            <span style={{ color: tone(vsAct) }}>{signStr(vsAct)}{cop(Math.abs(vsAct))}</span>
          </span>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Fecha de venta</label>
        <DatePicker id="m-fecha" type="datetime-local" value={fecha} onChange={setFecha} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-notas" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Notas (opcional)</label>
        <input className="form-input" type="text" id="m-notas" maxLength={30} placeholder="Ej. Vendido a tercero" value={notas} onChange={(e) => setNotas(e.target.value)} />
      </div>
      <AdvancedToggle label="Registrar en transacciones" hint="Desactivá si ya lo registraste en otra parte." checked={registrarTx} onChange={setRegistrarTx} />
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={() => void save()}>Confirmar venta</button>
        <button className="btn btn-dim" style={{ marginLeft: 'auto' }} onClick={closeModal}>Cancelar</button>
      </div>
      <FormStatus />
    </>
  )
}
