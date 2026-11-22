import { useState } from 'react'
import { FormFooter } from '../../controls/FormFooter'
import { MoneyInput } from '../../controls/MoneyInput'
import { Select } from '../../controls/Select'
import { errMsg, numToInput, parseMoney } from '../../lib/format'
import { useCategorias } from '@/shell/providers/CategoriasProvider'
import { useData } from '@/shell/providers/DataProvider'
import { useModal } from '@/shell/providers/ModalProvider'
import type { OpenerCtx } from '@/shell/hooks/openers'
import { useMutations } from '@/shell/hooks/useMutations'
import type { Frecuencia, Recurrente, TipoRec } from '../../types'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { FechaField, NotasField } from '../../controls/FormFields'

const frecOptions: { value: Frecuencia; label: string }[] = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
]


function RecurrenteForm({ item }: { item: Recurrente | null }) {
  const isEdit = item !== null
  const tipoInicial = item?.tipo || 'suscripcion'
  const { estado } = useData()
  const { setModalStatus } = useModal()
  const guardar = useGuardar()
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
    await guardar(async () => {
      if (item) await crudOp('rec', 'update', { ...data, _id: item._id })
      else await crudOp('rec', 'add', data)
    })
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
        <div className="form-label" id="lbl-grp-1">Tipo</div>
        <div className="tipo-toggle" role="group" aria-labelledby="lbl-grp-1">
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
          <label className="form-label" htmlFor="m-frecuencia">Frecuencia</label>
          <Select id="m-frecuencia" value={frecuencia} onChange={setFrecuencia} options={frecOptions} />
        </div>
      </div>
      <FechaField id="m-fecha" label="Fecha inicio (opcional)" value={fecha} onChange={setFecha} type="date" />
      <NotasField id="m-notas" placeholder="" value={notas} onChange={setNotas} labelClassName="text-sm tracking-normal text-muted-foreground normal-case" />
      <FormFooter saveLabel={isEdit ? 'Guardar cambios' : 'Agregar'} onSave={() => void save()} onDelete={isEdit ? () => void remove() : undefined} cancelClassName="ml-auto" />
    </>
  )
}

function MaterializeForm({ r, dateISO }: { r: Recurrente; dateISO: string }) {
  const { categorias } = useCategorias()
  const { setModalStatus } = useModal()
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
      setModalStatus('err', errMsg(err))
    }
  }

  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="m-cat">Categoría</label>
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
        <div className="mt-1.5 text-xs text-muted-foreground">
          Pre-llenado con el monto recurrente — ajustá si difiere.
        </div>
      </div>
      <FechaField id="m-fecha" label="Fecha" value={fecha} onChange={setFecha} type="date" />
      <NotasField id="m-notas" placeholder="" value={notas} onChange={setNotas} labelClassName="text-sm tracking-normal text-muted-foreground normal-case" />
      <FormFooter saveLabel="Registrar" onSave={() => void save()} cancelClassName="ml-auto" />
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
