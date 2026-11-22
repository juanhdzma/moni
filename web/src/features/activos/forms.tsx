import { useState, type ReactNode } from 'react'
import { AdvancedToggle } from '../../controls/AdvancedToggle'
import { FormFooter } from '../../controls/FormFooter'
import { MoneyInput } from '../../controls/MoneyInput'
import { cop, numToInput, parseMoney, pct, signStr } from '../../lib/format'
import { previewValorActivo, previewVenta } from '../../lib/api'
import { useOpenerCtx, type OpenerCtx } from '@/shell/hooks/openers'
import { useModal } from '@/shell/providers/ModalProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import { useVista } from '@/shell/hooks/useVista'
import { useData } from '@/shell/providers/DataProvider'
import type { Activo, ActivoIn, ActivoValor, ActivoVenta } from '../../types'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { FechaField, NotasField, RegistrarToggle } from '../../controls/FormFields'

const tone = (n: number) => (n >= 0 ? 'text-inversiones-text' : 'text-deudas')

export function openActivoForm(ctx: OpenerCtx, activo: Activo | null = null): void {
  ctx.openModal(activo ? 'Editar activo' : 'Nuevo activo', <ActivoForm activo={activo} />)
}

export function openActivoUpdateForm(ctx: OpenerCtx, a: Activo): void {
  ctx.openModal(`Actualizar valor · ${a.nombre}`, <ActivoUpdateForm activo={a} />)
}

export function openActivoSellForm(ctx: OpenerCtx, a: Activo): void {
  ctx.openModal(`Vender · ${a.nombre}`, <ActivoSellForm activo={a} />)
}

function ActivoForm({ activo }: { activo: Activo | null }): ReactNode {
  const isEdit = activo !== null
  const guardar = useGuardar()
  const { hoy } = useData().estado
  const { crudOp, crudOpOrBanner } = useMutations()
  const [nombre, setNombre] = useState(activo?.nombre ?? '')
  const [valIni, setValIni] = useState(activo ? numToInput(activo.valor_inicial) : '')
  const [valAct, setValAct] = useState(activo ? numToInput(activo.valor_actual) : '')
  const [fechaAdq, setFechaAdq] = useState(activo?.fecha_adquisicion?.split('T')[0] || hoy)
  const [esNueva, setEsNueva] = useState(true)

  const save = async () => {
    const valorActual = parseMoney(valAct)
    const data: ActivoIn = {
      nombre: nombre.trim(),
      valor_inicial: parseMoney(valIni),
      fecha_adquisicion: fechaAdq,
      ...(valorActual > 0 && { valor_actual: valorActual }),
    }
    await guardar(async () => {
      if (activo) await crudOp('activo', 'update', { ...data, _id: activo._id })
      else await crudOp('activo', 'add', { ...data, crear_tx: esNueva })
    })
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
      <FechaField id="m-fecha-adq" label="Fecha de adquisición" value={fechaAdq} onChange={setFechaAdq} type="date" />
      {!isEdit && <AdvancedToggle checked={esNueva} onChange={setEsNueva} />}
      <FormFooter saveLabel={isEdit ? 'Guardar cambios' : 'Agregar activo'} onSave={() => void save()} onDelete={isEdit ? () => void remove() : undefined} cancelClassName="sm:ml-auto" />
    </>
  )
}

function ActivoUpdateForm({ activo: a }: { activo: Activo }): ReactNode {
  const ctx = useOpenerCtx()
  const { closeModal } = useModal()
  const guardar = useGuardar()
  const { apiAction } = useMutations()
  const [nuevoTxt, setNuevoTxt] = useState('')
  const [fecha, setFecha] = useState('')
  const { cambio, cambio_pct: cambioPct } = a
  const nuevo = parseMoney(nuevoTxt)
  const { data: prev } = useVista(nuevo > 0 ? `activo-valor:${a._id}:${nuevo}` : null, () => previewValorActivo(a._id, nuevo))
  const { delta, total, total_pct: totalPct } = prev ?? { delta: 0, total: 0, total_pct: 0 }

  const save = async () => {
    await guardar(async () => {
      const body: ActivoValor = { nuevo_valor: nuevo, ...(fecha && { fecha }) }
      await apiAction(`/api/activo/${a._id}/valor`, body)
    })
  }

  return (
    <>
      <div className="modal-panel">
        <div className="modal-panel-col">
          <div className="modal-panel-label">Valor actual</div>
          <div className="modal-panel-value">{cop(a.valor_actual)}</div>
        </div>
        <div className="modal-panel-col right">
          <div className="modal-panel-label">Vs. precio inicial</div>
          <div className={'text-base font-semibold ' + tone(cambio)}>
            {signStr(cambio)}{cop(Math.abs(cambio))} <span className="text-xs font-medium">({signStr(cambioPct)}{pct(Math.abs(cambioPct))}%)</span>
          </div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-nuevo-valor">Nuevo valor (COP)</label>
        <MoneyInput id="m-nuevo-valor" value={nuevoTxt} onChange={setNuevoTxt} />
      </div>
      <div id="activo-update-preview" className={'breakdown' + (nuevo && prev ? ' visible' : '')}>
        <div className="breakdown-row">
          <span className="breakdown-label">Cambio desde último</span>
          <span className="breakdown-value" id="activo-delta">
            <span className={tone(delta)}>{signStr(delta)}{cop(Math.abs(delta))}</span>
          </span>
        </div>
        <div className="breakdown-row">
          <span className="breakdown-label">Variación vs precio inicial</span>
          <span className="breakdown-value" id="activo-total">
            <span className={tone(total)}>{signStr(total)}{cop(Math.abs(total))} <span className="text-xs font-medium">({signStr(totalPct)}{pct(Math.abs(totalPct))}%)</span></span>
          </span>
        </div>
      </div>
      <FechaField id="m-fecha" label="Fecha de valoración (hoy si se omite)" value={fecha} onChange={setFecha} />
      <FormFooter saveLabel="Actualizar" onSave={() => void save()} onEdit={() => { closeModal(); openActivoForm(ctx, a) }} editLabel="Editar activo" cancelClassName="sm:ml-auto" />
    </>
  )
}

function ActivoSellForm({ activo: a }: { activo: Activo }): ReactNode {
  const guardar = useGuardar()
  const { apiAction } = useMutations()
  const [precioTxt, setPrecioTxt] = useState(numToInput(a.valor_actual))
  const [fecha, setFecha] = useState('')
  const [notas, setNotas] = useState('')
  const [registrarTx, setRegistrarTx] = useState(true)
  const precio = parseMoney(precioTxt)
  const { data: prev } = useVista(precio > 0 ? `activo-venta:${a._id}:${precio}` : null, () => previewVenta(a._id, precio))
  const vsIni = prev?.vs_inicial ?? 0
  const vsAct = prev?.vs_actual ?? 0

  const save = async () => {
    await guardar(async () => {
      const body: ActivoVenta = { precio, notas: notas.trim(), registrar_tx: registrarTx, ...(fecha && { fecha }) }
      await apiAction(`/api/activo/${a._id}/venta`, body)
    })
  }

  return (
    <>
      <div className="modal-panel">
        <div className="modal-panel-col">
          <div className="modal-panel-label">Valor actual</div>
          <div className="modal-panel-value">{cop(a.valor_actual)}</div>
        </div>
        <div className="modal-panel-col right">
          <div className="modal-panel-label">Precio inicial</div>
          <div className="text-base font-semibold">{cop(a.valor_inicial)}</div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-precio">Precio de venta (COP)</label>
        <MoneyInput id="m-precio" value={precioTxt} onChange={setPrecioTxt} />
      </div>
      <div id="activo-sell-preview" className={'breakdown' + (precio && prev ? ' visible' : '')}>
        <div className="breakdown-row">
          <span className="breakdown-label">Ganancia vs precio inicial</span>
          <span className="breakdown-value" id="sell-gain-ini">
            <span className={tone(vsIni)}>{signStr(vsIni)}{cop(Math.abs(vsIni))}</span>
          </span>
        </div>
        <div className="breakdown-row">
          <span className="breakdown-label">Diferencia vs último valor</span>
          <span className="breakdown-value" id="sell-gain-act">
            <span className={tone(vsAct)}>{signStr(vsAct)}{cop(Math.abs(vsAct))}</span>
          </span>
        </div>
      </div>
      <FechaField id="m-fecha" label="Fecha de venta (hoy si se omite)" value={fecha} onChange={setFecha} />
      <NotasField id="m-notas" placeholder="Ej. Vendido a tercero" value={notas} onChange={setNotas} labelClassName="" />
      <RegistrarToggle checked={registrarTx} onChange={setRegistrarTx} />
      <FormFooter saveLabel="Confirmar venta" onSave={() => void save()} cancelClassName="sm:ml-auto" />
    </>
  )
}
