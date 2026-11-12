import { useState } from 'react'
import { DatePicker } from '../../controls/DatePicker'
import { FormStatus } from '../../controls/FormStatus'
import { MoneyInput } from '../../controls/MoneyInput'
import { Select } from '../../controls/Select'
import { numToInput, parseMoney } from '../../lib/format'
import { FRECUENCIAS } from '../../lib/recurrentes'
import { useCategorias } from '../../shell/CategoriasProvider'
import { useData } from '../../shell/DataProvider'
import { useModal } from '../../shell/ModalProvider'
import type { OpenerCtx } from '../../shell/openers'
import { useMutations } from '../../shell/useMutations'
import type { Frecuencia, Recurrente, TipoRec } from '../../types'

const frecOptions = (Object.entries(FRECUENCIAS) as [Frecuencia, (typeof FRECUENCIAS)[Frecuencia]][]).map(
  ([value, v]) => ({ value, label: v.label }),
)

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

function RecurrenteForm({ item }: { item: Recurrente | null }) {
  const isEdit = item !== null
  const tipoInicial = item?.tipo || 'suscripcion'
  const { estado } = useData()
  const { closeModal, setModalStatus } = useModal()
  const { crudOp, crudOpOrBanner } = useMutations()
  const [nombre, setNombre] = useState(item?.nombre || '')
  const [tipo, setTipo] = useState<TipoRec>(tipoInicial !== 'ingreso' ? 'gasto' : 'ingreso')
  const [monto, setMonto] = useState(item ? numToInput(item.monto) : '')
  const [frecuencia, setFrecuencia] = useState<string>(item?.frecuencia || 'mensual')
  const [fecha, setFecha] = useState(item?.fecha_inicio?.split('T')[0] || '')
  const [notas, setNotas] = useState(item?.notas || '')

  const save = async () => {
    const nombreOk = nombre.trim()
    const montoNum = parseMoney(monto)
    if (!nombreOk) return setModalStatus('err', 'Nombre requerido')
    if (!montoNum) return setModalStatus('err', 'Monto requerido')
    const activoActual = item ? (estado.recurrentes.find((r) => r._id === item._id)?.activo ?? true) : true
    const data = {
      nombre: nombreOk,
      tipo,
      monto: montoNum,
      frecuencia: frecuencia as Frecuencia,
      activo: activoActual,
      fecha_inicio: fecha,
      notas: notas.trim(),
    }
    setModalStatus('', 'Guardando...')
    try {
      if (item) await crudOp('rec', 'update', { ...data, _id: item._id })
      else await crudOp('rec', 'add', data)
    } catch (err) {
      setModalStatus('err', '❌ ' + errMsg(err))
    }
  }

  const remove = async () => {
    if (!item) return
    const r = estado.recurrentes.find((x) => x._id === item._id)
    if (!confirm(`¿Eliminar "${r?.nombre}"?`)) return
    await crudOpOrBanner('rec', 'delete', { _id: item._id })
  }

  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="m-nombre">Nombre</label>
        <input
          className="form-input"
          type="text"
          id="m-nombre"
          maxLength={40}
          value={nombre}
          placeholder="Ej. Netflix"
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Tipo</label>
        <div className="tipo-toggle">
          <button
            type="button"
            id="rt-ingreso"
            className={`tipo-btn ingreso ${tipo === 'ingreso' ? 'sel' : ''}`}
            onClick={() => setTipo('ingreso')}
          >
            Ingreso
          </button>
          <button
            type="button"
            id="rt-gasto"
            className={`tipo-btn gasto ${tipo === 'gasto' ? 'sel' : ''}`}
            onClick={() => setTipo('gasto')}
          >
            Gasto
          </button>
        </div>
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="m-monto">Monto (COP)</label>
          <MoneyInput id="m-monto" value={monto} onChange={setMonto} />
        </div>
        <div className="form-group">
          <label className="form-label">Frecuencia</label>
          <Select id="m-frecuencia" value={frecuencia} onChange={setFrecuencia} options={frecOptions} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Fecha inicio (opcional)</label>
        <DatePicker id="m-fecha" value={fecha} onChange={setFecha} />
      </div>
      <div className="form-group">
        <label
          className="form-label"
          htmlFor="m-notas"
          style={{ textTransform: 'none', letterSpacing: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}
        >
          Notas (opcional)
        </label>
        <input
          className="form-input"
          type="text"
          id="m-notas"
          maxLength={30}
          value={notas}
          placeholder=""
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={() => void save()}>
          {isEdit ? 'Guardar cambios' : 'Agregar'}
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
      <FormStatus style={{ marginTop: 'var(--sp-3)' }} />
    </>
  )
}

function MaterializeForm({ r, dateISO }: { r: Recurrente; dateISO: string }) {
  const { categorias } = useCategorias()
  const { closeModal, setModalStatus } = useModal()
  const { crudOp } = useMutations()
  const cats = categorias[r.tipo === 'ingreso' ? 'ingreso' : 'gasto'] || []
  const [categoria, setCategoria] = useState(cats.includes(r.nombre) ? r.nombre : (cats[cats.length - 1] ?? ''))
  const [descripcion, setDescripcion] = useState(r.nombre)
  const [monto, setMonto] = useState(numToInput(r.monto))
  const [fecha, setFecha] = useState(dateISO)
  const [notas, setNotas] = useState('')

  const save = async () => {
    const montoNum = parseMoney(monto)
    if (!montoNum || montoNum <= 0) return setModalStatus('err', 'Ingresá un monto válido')
    if (!fecha) return setModalStatus('err', 'Fecha requerida')
    try {
      await crudOp('tx', 'add', {
        fecha: `${fecha}T00:00`,
        tipo: r.tipo === 'ingreso' ? 'ingreso' : 'gasto',
        categoria,
        descripcion: descripcion.trim(),
        monto: montoNum,
        notas: notas.trim(),
        tarjeta_id: null,
      })
    } catch (err) {
      setModalStatus('err', '❌ ' + errMsg(err))
    }
  }

  return (
    <>
      <div className="form-group">
        <label className="form-label">Categoría</label>
        <Select id="m-cat" value={categoria} onChange={setCategoria} options={cats.map((c) => ({ value: c, label: c }))} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-desc">Descripción</label>
        <input
          className="form-input"
          type="text"
          id="m-desc"
          maxLength={30}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-monto">Monto (COP)</label>
        <MoneyInput id="m-monto" value={monto} onChange={setMonto} />
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 5 }}>
          Pre-llenado con el monto recurrente — ajustá si difiere.
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Fecha</label>
        <DatePicker id="m-fecha" value={fecha} onChange={setFecha} />
      </div>
      <div className="form-group">
        <label
          className="form-label"
          htmlFor="m-notas"
          style={{ textTransform: 'none', letterSpacing: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}
        >
          Notas (opcional)
        </label>
        <input
          className="form-input"
          type="text"
          id="m-notas"
          maxLength={30}
          value={notas}
          placeholder=""
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>
      <div className="modal-footer">
        <button className="btn btn-accent" onClick={() => void save()}>
          Registrar
        </button>
        <button className="btn btn-dim" style={{ marginLeft: 'auto' }} onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}

export function openRecurrenteForm(ctx: OpenerCtx, item: Recurrente | null = null): void {
  ctx.openModal(item ? 'Editar recurrente' : 'Nuevo recurrente', <RecurrenteForm item={item} />)
}

export function openRecurrenteFormById(ctx: OpenerCtx, id: number): void {
  openRecurrenteForm(ctx, ctx.estado.recurrentes.find((r) => r._id === id) ?? null)
}

export function openRecurrenteMaterializeFormById(ctx: OpenerCtx, id: number, dateISO: string): void {
  const r = ctx.estado.recurrentes.find((x) => x._id === id)
  if (!r) return
  ctx.openModal(`Registrar · ${r.nombre}`, <MaterializeForm r={r} dateISO={dateISO} />)
}
